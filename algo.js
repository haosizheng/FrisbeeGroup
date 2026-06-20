/**
 * Frisbee Grouping Algorithm Engine (algo.js)
 * Implements various grouping strategies with multi-constraint optimization:
 * - Group size balance (max difference of 1)
 * - Gender ratio parity (minimized difference of male/female count per team)
 * - History repetition penalty (recent teammate relations check)
 * - Different strategies (Balanced, Run-Dog, Lion-Sheep, God's Will)
 */

// Helper: Calculate standard deviation of an array of numbers
function calculateStdDev(array) {
  const n = array.length;
  if (n === 0) return 0;
  const mean = array.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n);
}

// Calculate a player's base overall score
function getPlayerOverall(player) {
  const sum = parseFloat(player.ratings.throw || 0) +
              parseFloat(player.ratings.catch || 0) +
              parseFloat(player.ratings.stamina || 0) +
              parseFloat(player.ratings.speed || 0) +
              parseFloat(player.ratings.defense || 0) +
              parseFloat(player.ratings.awareness || 0) +
              parseFloat(player.ratings.build || 0) +
              parseFloat(player.ratings.sportsmanship || 0);
  return parseFloat((sum / 8).toFixed(2));
}

/**
 * Main Grouping Function
 * @param {Array} players - List of active players to group
 * @param {number} groupCount - Number of teams to split into (2, 3, or 4)
 * @param {string} strategy - 'balance', 'run-dog', 'lion-sheep', 'god'
 * @param {boolean} genderBalance - If true, enforce close male/female ratio
 * @param {boolean} avoidHistory - If true, penalize matching past teammates
 * @param {Array} history - List of past groupings (last 30 items)
 * @returns {Array} List of teams, each containing players list and meta stats
 */
function performGrouping(players, groupCount, strategy, genderBalance, avoidHistory, history) {
  if (!players || players.length < groupCount) {
    throw new Error(`队员人数不足，无法分为 ${groupCount} 队`);
  }

  // Clone players list
  const activePlayers = JSON.parse(JSON.stringify(players));
  const numPlayers = activePlayers.length;

  // Pre-calculate base attributes
  activePlayers.forEach(p => {
    p.overall = getPlayerOverall(p);
  });

  // 1. Pre-process strategies / Apply modifiers
  let workingPlayers = [...activePlayers];

  if (strategy === 'god') {
    // Strategy: 上帝安排 - Add random jitter (-1.5 to 1.5) to players overall rating
    workingPlayers.forEach(p => {
      const jitter = (Math.random() * 3) - 1.5;
      p.effectiveRating = Math.max(1, Math.min(5, p.overall + jitter));
    });
  } else if (strategy === 'run-dog') {
    // Strategy: 看盘跑死狗 - Give extra weight to Throwing and Speed/Agility synergy
    workingPlayers.forEach(p => {
      // Calculate high throw + high speed focus
      p.effectiveRating = (p.ratings.throw * 1.5 + p.ratings.speed * 1.5 + p.ratings.stamina * 1.0) / 4.0;
    });
  } else {
    // Default or Lion-Sheep
    workingPlayers.forEach(p => {
      p.effectiveRating = p.overall;
    });
  }

  // 2. Teammate co-occurrence lookup table from history (avoid history repeats)
  const coOccurrenceMap = {};
  if (avoidHistory && history && history.length > 0) {
    history.forEach(session => {
      if (session.teams && session.teams.length > 0) {
        session.teams.forEach(team => {
          const ids = team.players.map(p => p.id);
          for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
              const key1 = `${ids[i]}-${ids[j]}`;
              const key2 = `${ids[j]}-${ids[i]}`;
              coOccurrenceMap[key1] = (coOccurrenceMap[key1] || 0) + 1;
              coOccurrenceMap[key2] = (coOccurrenceMap[key2] || 0) + 1;
            }
          }
        });
      }
    });
  }

  // 3. Optimization Search (Monte Carlo / Randomized Trials)
  // We run multiple iterations to find the assignment with the lowest cost/penalty
  let bestAssignment = null;
  let bestCost = Infinity;
  const iterations = 6000; // Fast enough for <= 30 players in JS

  // For Lion-Sheep: we distribute the top K stars (lions) first, 1 per team
  let stars = [];
  let ordinary = [];
  if (strategy === 'lion-sheep') {
    // Sort by overall descending
    const sorted = [...workingPlayers].sort((a, b) => b.overall - a.overall);
    stars = sorted.slice(0, groupCount); // Top K players
    ordinary = sorted.slice(groupCount); // Rest are sheep
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Initialize empty teams
    const teams = Array.from({ length: groupCount }, (_, index) => ({
      id: index,
      name: `Team ${String.fromCharCode(65 + index)}`, // Team A, B, C...
      players: [],
      score: 0,
      males: 0,
      females: 0
    }));

    if (strategy === 'lion-sheep') {
      // 1 per team for the stars (shuffle stars first so different teams get different lions)
      const shuffledStars = [...stars].sort(() => Math.random() - 0.5);
      shuffledStars.forEach((star, index) => {
        teams[index].players.push(star);
      });

      // Distribute sheep randomly to maintain sizes
      const shuffledOrdinary = [...ordinary].sort(() => Math.random() - 0.5);
      shuffledOrdinary.forEach((player) => {
        // Find team with fewest players
        let minTeam = teams[0];
        for (let i = 1; i < teams.length; i++) {
          if (teams[i].players.length < minTeam.players.length) {
            minTeam = teams[i];
          }
        }
        minTeam.players.push(player);
      });
    } else {
      // Standard random distribution
      const shuffled = [...workingPlayers].sort(() => Math.random() - 0.5);
      shuffled.forEach((player) => {
        // Find team with fewest players to maintain balance
        let minTeam = teams[0];
        for (let i = 1; i < teams.length; i++) {
          if (teams[i].players.length < minTeam.players.length) {
            minTeam = teams[i];
          }
        }
        minTeam.players.push(player);
      });
    }

    // Calculate details for this trial assignment
    teams.forEach(team => {
      team.score = team.players.reduce((sum, p) => sum + p.effectiveRating, 0);
      team.males = team.players.filter(p => p.gender === 'male').length;
      team.females = team.players.filter(p => p.gender === 'female').length;
    });

    // Evaluate constraints and calculate penalty cost
    let cost = 0;

    // Hard Constraint: Size Balance
    const sizes = teams.map(t => t.players.length);
    const maxSizeDiff = Math.max(...sizes) - Math.min(...sizes);
    if (maxSizeDiff > 1) {
      cost += 100000; // Disallow size difference > 1
    }

    // Gender Parity Constraint
    if (genderBalance) {
      // Target: minimize the difference in male counts and female counts between teams
      const maleCounts = teams.map(t => t.males);
      const femaleCounts = teams.map(t => t.females);
      
      const maleDiff = Math.max(...maleCounts) - Math.min(...maleCounts);
      const femaleDiff = Math.max(...femaleCounts) - Math.min(...femaleCounts);
      
      // Strongly penalize high gender differences
      cost += maleDiff * 8000;
      cost += femaleDiff * 8000;
    }

    // History Repetition Penalty
    if (avoidHistory && Object.keys(coOccurrenceMap).length > 0) {
      let historyPenalty = 0;
      teams.forEach(team => {
        const ids = team.players.map(p => p.id);
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const pairKey = `${ids[i]}-${ids[j]}`;
            if (coOccurrenceMap[pairKey]) {
              // Exponential penalty for repeated teammate combos
              historyPenalty += Math.pow(coOccurrenceMap[pairKey], 1.5) * 600;
            }
          }
        }
      });
      cost += historyPenalty;
    }

    // Score Balance Strategy Cost
    if (strategy === 'balance' || strategy === 'god' || strategy === 'run-dog') {
      // Minimize standard deviation of team scores
      const teamScores = teams.map(t => t.score);
      const stdDev = calculateStdDev(teamScores);
      cost += stdDev * 2000; // Strong balancing penalty
    } else if (strategy === 'lion-sheep') {
      // For Lion-sheep, we already put 1 lion in each team. 
      // Now we balance the "sheep strength" across teams so each star has balanced support.
      const sheepScores = teams.map(team => {
        // Sum of ratings of players excluding the highest rating (the lion)
        const sortedRatings = team.players.map(p => p.effectiveRating).sort((a,b) => b-a);
        const sheepSum = sortedRatings.slice(1).reduce((s, r) => s + r, 0);
        return sheepSum;
      });
      const stdDevSheep = calculateStdDev(sheepScores);
      cost += stdDevSheep * 2500;
    }

    // Track the best assignment
    if (cost < bestCost) {
      bestCost = cost;
      bestAssignment = teams;
    }
  }

  // Post-calculate scores using base overall for final presentation display
  bestAssignment.forEach(team => {
    // Recalculate true team strength based on true overall
    team.trueOverallSum = team.players.reduce((sum, p) => sum + p.overall, 0);
    team.trueAverage = parseFloat((team.trueOverallSum / team.players.length).toFixed(2));
  });

  return bestAssignment;
}
