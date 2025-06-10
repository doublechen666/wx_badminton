App({
  globalData: {
    userInfo: null,
    players: [],  // 存储所有已注册的选手信息
    matchHistory: [], // 存储所有比赛历史记录
    version: 'v0.0.1' // 当前应用版本号
  },
  onLaunch: function() {
    // 获取本地存储的玩家和比赛历史数据
    const players = wx.getStorageSync('players') || [];
    const matchHistory = wx.getStorageSync('matchHistory') || [];
    this.globalData.players = players;
    this.globalData.matchHistory = matchHistory;
    
    // 检查并创建管理员账号
    this.initAdminAccount();
    
    // 打印日志确认函数被调用
    console.log('尝试初始化管理员账号');
  },
  // ELO积分计算函数
  calculateEloRating: function(winnerRating, loserRating, scoreDiff) {
    const K = 32; // 基础K因子，标准ELO系统通常使用16-32
    const D = 400; // 分数差异因子，标准ELO使用400
    
    // 计算期望胜率
    const expectWin = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / D));
    const expectLose = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / D));
    
    // 比分差距系数 - 使用更明显的非线性变换
    // 羽毛球比赛通常以2分差距获胜，所以我们根据比分差距增加权重
    // 比分差距越大，说明胜利越明显，应该获得更多积分
    let scoreFactor = 1.0;
    if (scoreDiff <= 2) {
      // 最小分差(1-2分)，基础系数1.0
      scoreFactor = 1.0;
    } else if (scoreDiff <= 5) {
      // 中等分差(3-5分)，线性增加到1.5
      scoreFactor = 1.0 + (scoreDiff - 2) * 0.2; // 增加系数从0.15到0.2
    } else if (scoreDiff <= 10) {
      // 较大分差(6-10分)，增加到2.5
      scoreFactor = 1.6 + (scoreDiff - 5) * 0.18; // 增加系数从0.1到0.18，起始值从1.5到1.6
    } else if (scoreDiff <= 15) {
      // 很大分差(11-15分)，增加到3.0
      scoreFactor = 2.5 + (scoreDiff - 10) * 0.1;
    } else {
      // 碾压局(>15分)，最大系数3.0
      scoreFactor = 3.0;
    }
    
    // 计算实际K因子 - 根据玩家等级动态调整
    // 等级越高，K因子越小，分数变化越慢；等级越低，分数变化越快
    let winnerK = K;
    let loserK = K;
    
    // 高分段玩家(>1800)K因子减小，低分段玩家(<1000)K因子增大
    if (winnerRating > 1800) {
      winnerK = K * (2000 - Math.min(winnerRating, 2000)) / 200;
    } else if (winnerRating < 1000) {
      winnerK = K * (1.0 + (1000 - winnerRating) / 1000);
    }
    
    if (loserRating > 1800) {
      loserK = K * (2000 - Math.min(loserRating, 2000)) / 200;
    } else if (loserRating < 1000) {
      loserK = K * (1.0 + (1000 - loserRating) / 1000);
    }
    
    // 计算分数变化，考虑比分差距和实际K因子
    let winnerChange = Math.round(winnerK * (1 - expectWin) * scoreFactor);
    let loserChange = Math.round(loserK * (0 - expectLose) * scoreFactor);
    
    // 限制单场比赛分数变化范围
    winnerChange = Math.min(winnerChange, 100); // 从80增加到100
    winnerChange = Math.max(winnerChange, 5);
    
    loserChange = Math.min(loserChange, -5);
    loserChange = Math.max(loserChange, -100); // 从-80减少到-100
    
    return {
      winnerChange,
      loserChange
    };
  },
  
  // 更新提交比赛时的积分计算
  submitMatch: function(matchData) {
    const { leftTeam, rightTeam, leftScore, rightScore } = matchData;
    const winner = leftScore > rightScore ? 'left' : 'right';
    
    // 获取所有选手
    const allPlayers = this.globalData.players || [];
    
    // 区分获胜队伍和失败队伍
    const winnerTeam = winner === 'left' ? leftTeam : rightTeam;
    const loserTeam = winner === 'left' ? rightTeam : leftTeam;
    const winnerScore = winner === 'left' ? leftScore : rightScore;
    const loserScore = winner === 'left' ? rightScore : leftScore;
    
    // 计算比分差距
    const scoreDiff = winnerScore - loserScore;
    
    // 计算队伍平均分
    const getTeamAverageRating = (team) => {
      let totalRating = 0;
      team.forEach(player => {
        const playerInfo = allPlayers.find(p => p.id === player.id);
        if (playerInfo) {
          totalRating += playerInfo.score || 1000;
        } else {
          totalRating += 1000;
        }
      });
      return totalRating / team.length;
    };
    
    const winnerAvgRating = getTeamAverageRating(winnerTeam);
    const loserAvgRating = getTeamAverageRating(loserTeam);
    
    // 计算积分变化，考虑比分差距
    const { winnerChange, loserChange } = this.calculateEloRating(winnerAvgRating, loserAvgRating, scoreDiff);
    
    // 存储调整后的胜利方分数变化
    let adjustedWinnerChange = winnerChange;
    
    // 更新选手积分
    winnerTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 获取当前选手分数
        const currentScore = allPlayers[index].score || 1000;
        
        // 根据选手分数区间调整加分倍率
        adjustedWinnerChange = winnerChange;
        if (currentScore < 2000) {
          // 2000分以下，加分翻5倍
          adjustedWinnerChange = winnerChange * 5;
        } else if (currentScore < 3000) {
          // 2000-3000分，加分翻3倍
          adjustedWinnerChange = winnerChange * 3;
        } else if (currentScore < 4000) {
          // 3000-4000分，加分翻2倍
          adjustedWinnerChange = winnerChange * 2;
        }
        // 4000分以上，加分正常
        
        // 计算新分数并应用上下限
        let newScore = currentScore + adjustedWinnerChange;
        newScore = Math.min(10000, Math.max(500, newScore)); // 应用上限10000和下限500
        
        allPlayers[index].score = newScore;
        allPlayers[index].wins = (allPlayers[index].wins || 0) + 1;
        
        // 更新胜率统计
        this.updatePlayerWinRateStats(allPlayers[index], true, winnerTeam.length > 1, loserTeam);
      }
    });
    
    loserTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 计算新分数并应用上下限
        let newScore = (allPlayers[index].score || 1000) + loserChange;
        newScore = Math.min(10000, Math.max(500, newScore)); // 应用上限10000和下限500
        
        allPlayers[index].score = newScore;
        allPlayers[index].losses = (allPlayers[index].losses || 0) + 1;
        
        // 更新胜率统计
        this.updatePlayerWinRateStats(allPlayers[index], false, loserTeam.length > 1, winnerTeam);
      }
    });
    
    // 保存更新后的选手数据
    this.globalData.players = allPlayers;
    wx.setStorageSync('players', allPlayers);
    
    return {
      winnerChange: adjustedWinnerChange,
      loserChange: loserChange
    };
  },
  
  // 更新选手胜率统计数据
  updatePlayerWinRateStats: function(player, isWin, isDoubles, opposingTeam) {
    // 初始化统计数据（如果不存在）
    if (!player.singlesWins) player.singlesWins = 0;
    if (!player.singlesLosses) player.singlesLosses = 0;
    if (!player.doublesWins) player.doublesWins = 0;
    if (!player.doublesLosses) player.doublesLosses = 0;
    
    // 根据比赛类型更新统计
    if (isDoubles) {
      // 双打比赛
      if (isWin) {
        player.doublesWins++;
      } else {
        player.doublesLosses++;
      }
      
      // 更新具体双打类型（男双、女双、混双）
      this.updateDoublesTypeStats(player, isWin, opposingTeam);
    } else {
      // 单打比赛
      if (isWin) {
        player.singlesWins++;
      } else {
        player.singlesLosses++;
      }
    }
    
    // 计算胜率
    const totalWins = (player.singlesWins || 0) + (player.doublesWins || 0);
    const totalLosses = (player.singlesLosses || 0) + (player.doublesLosses || 0);
    const totalMatches = totalWins + totalLosses;
    
    const singlesTotal = (player.singlesWins || 0) + (player.singlesLosses || 0);
    const doublesTotal = (player.doublesWins || 0) + (player.doublesLosses || 0);
    
    player.winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '0%';
    player.singlesWinRate = singlesTotal > 0 ? Math.round((player.singlesWins / singlesTotal) * 100) + '%' : '0%';
    player.doublesWinRate = doublesTotal > 0 ? Math.round((player.doublesWins / doublesTotal) * 100) + '%' : '0%';
  },
  
  // 更新双打类型统计
  updateDoublesTypeStats: function(player, isWin, opposingTeam) {
    // 初始化统计数据（如果不存在）
    if (!player.maleDoublesWins) player.maleDoublesWins = 0;
    if (!player.maleDoublesLosses) player.maleDoublesLosses = 0;
    if (!player.femaleDoublesWins) player.femaleDoublesWins = 0;
    if (!player.femaleDoublesLosses) player.femaleDoublesLosses = 0;
    if (!player.mixedDoublesWins) player.mixedDoublesWins = 0;
    if (!player.mixedDoublesLosses) player.mixedDoublesLosses = 0;
    
    // 判断双打类型
    const allPlayers = this.globalData.players || [];
    
    // 获取对方选手的性别信息
    const opposingGenders = opposingTeam.map(p => {
      const playerInfo = allPlayers.find(player => player.id === p.id);
      return playerInfo ? playerInfo.gender : 'male'; // 默认为男性
    });
    
    // 判断双打类型
    let doublesType = 'mixed'; // 默认为混双
    
    if (opposingGenders.every(gender => gender === 'male')) {
      // 对方都是男性，这是男双
      doublesType = 'male';
    } else if (opposingGenders.every(gender => gender === 'female')) {
      // 对方都是女性，这是女双
      doublesType = 'female';
    } else {
      // 否则是混双
      doublesType = 'mixed';
    }
    
    // 更新相应统计
    if (doublesType === 'male') {
      if (isWin) {
        player.maleDoublesWins++;
      } else {
        player.maleDoublesLosses++;
      }
    } else if (doublesType === 'female') {
      if (isWin) {
        player.femaleDoublesWins++;
      } else {
        player.femaleDoublesLosses++;
      }
    } else {
      if (isWin) {
        player.mixedDoublesWins++;
      } else {
        player.mixedDoublesLosses++;
      }
    }
    
    // 计算各类型胜率
    const maleDoublesTotal = (player.maleDoublesWins || 0) + (player.maleDoublesLosses || 0);
    const femaleDoublesTotal = (player.femaleDoublesWins || 0) + (player.femaleDoublesLosses || 0);
    const mixedDoublesTotal = (player.mixedDoublesWins || 0) + (player.mixedDoublesLosses || 0);
    
    player.maleDoublesWinRate = maleDoublesTotal > 0 ? Math.round((player.maleDoublesWins / maleDoublesTotal) * 100) + '%' : '0%';
    player.femaleDoublesWinRate = femaleDoublesTotal > 0 ? Math.round((player.femaleDoublesWins / femaleDoublesTotal) * 100) + '%' : '0%';
    player.mixedDoublesWinRate = mixedDoublesTotal > 0 ? Math.round((player.mixedDoublesWins / mixedDoublesTotal) * 100) + '%' : '0%';
  },
  
  // 初始化管理员账号
  initAdminAccount: function() {
    const users = wx.getStorageSync('users') || [];
    
    // 检查管理员账号是否存在
    const adminExists = users.some(u => u.isAdmin && u.username === 'lifeihong');
    let adminUserId;
    
    if (!adminExists) {
      // 创建管理员账号
      const adminUser = {
        userId: 'admin_' + Date.now(),
        username: 'lifeihong',
        password: 'lfh123456',
        nickName: '管理员',
        avatarUrl: '/images/default-avatar.png', // 固定使用默认头像
        createTime: new Date().toISOString(),
        isAdmin: true
      };
      
      adminUserId = adminUser.userId;
      users.push(adminUser);
      wx.setStorageSync('users', users);
      console.log('管理员账号已创建');
      
      // 为管理员创建默认选手
      const players = wx.getStorageSync('players') || [];
      const adminPlayerExists = players.some(p => p.userId === adminUserId);
      
      if (!adminPlayerExists) {
        // 创建名为"小飞"的男性选手
        const adminPlayer = {
          id: Date.now().toString(),
          userId: adminUserId,
          name: '小飞',
          gender: 'male',
          avatarUrl: '/images/default-avatar.png',
          score: 1000,
          wins: 0,
          losses: 0
        };
        
        players.push(adminPlayer);
        wx.setStorageSync('players', players);
        this.globalData.players = players;
        console.log('管理员默认选手"小飞"已创建');
      }
    } else {
      // 获取已存在的管理员ID
      adminUserId = users.find(u => u.isAdmin && u.username === 'lifeihong').userId;
      
      // 检查管理员是否已有关联选手
      const players = wx.getStorageSync('players') || [];
      const adminPlayerExists = players.some(p => p.userId === adminUserId);
      
      if (!adminPlayerExists) {
        // 创建名为"小飞"的男性选手
        const adminPlayer = {
          id: Date.now().toString(),
          userId: adminUserId,
          name: '小飞',
          gender: 'male',
          avatarUrl: '/images/default-avatar.png',
          score: 1000,
          wins: 0,
          losses: 0
        };
        
        players.push(adminPlayer);
        wx.setStorageSync('players', players);
        this.globalData.players = players;
        console.log('管理员默认选手"小飞"已创建');
      }
    }
  },
  syncPlayersData: function() {
    // 确保内存中的数据和存储中的数据同步
    const storedPlayers = wx.getStorageSync('players') || [];
    
    // 检查是否有被删除的选手需要恢复
    const deletedPlayers = wx.getStorageSync('deletedPlayers') || {};
    
    // 创建名字到选手的映射
    const playerNameMap = {};
    storedPlayers.forEach(player => {
      if (player && player.name) {
        playerNameMap[player.name] = player;
      }
    });
    
    // 将删除的选手数据与当前选手数据合并
    let updated = false;
    for (const [name, data] of Object.entries(deletedPlayers)) {
      if (!playerNameMap[name]) {
        // 如果当前没有同名选手，不需要处理
        continue;
      }
      
      // 找到同名选手的索引
      const playerIndex = storedPlayers.findIndex(p => p.name === name);
      if (playerIndex !== -1) {
        // 更新选手ID以关联历史记录
        storedPlayers[playerIndex].id = data.id;
        
        // 使用更高的积分
        const currentScore = storedPlayers[playerIndex].score || 1000;
        const deletedScore = data.score || 1000;
        storedPlayers[playerIndex].score = Math.max(currentScore, deletedScore);
        
        // 合并胜负记录
        storedPlayers[playerIndex].wins = (storedPlayers[playerIndex].wins || 0) + (data.wins || 0);
        storedPlayers[playerIndex].losses = (storedPlayers[playerIndex].losses || 0) + (data.losses || 0);
        
        // 从删除列表中移除
        delete deletedPlayers[name];
        updated = true;
      }
    }
    
    // 如果有更新，保存修改后的数据
    if (updated) {
      wx.setStorageSync('deletedPlayers', deletedPlayers);
      wx.setStorageSync('players', storedPlayers);
    }
    
    this.globalData.players = storedPlayers;
    return storedPlayers;
  },
  
  /**
   * 合并重复的选手数据，特别是针对"小飞"选手
   * 将两个同名选手的数据合并，保留本项目的选手ID，合并积分和历史记录
   * @param {String} playerName - 要合并的选手名称
   * @returns {Boolean} - 是否成功合并
   */
  mergeDuplicatePlayer: function(playerName) {
    // 确保从存储获取最新数据
    const allPlayers = wx.getStorageSync('players') || [];
    this.globalData.players = allPlayers; // 更新全局数据
    
    // 查找所有同名选手
    const sameNamePlayers = allPlayers.filter(p => p && p.name === playerName);
    
    // 如果没有找到或者只有一个，不需要合并
    if (sameNamePlayers.length <= 1) {
      console.log(`没有找到重复的选手: ${playerName}`);
      return false;
    }
    
    console.log(`找到 ${sameNamePlayers.length} 个名为 "${playerName}" 的选手，准备合并`);
    
    // 找出管理员账号关联的选手（本项目默认的选手）
    // 通常这个选手会有 isAdmin 标记或者是第一个创建的选手
    let primaryPlayer = null;
    
    // 首先尝试找到管理员账号关联的选手
    for (const player of sameNamePlayers) {
      if (player.isAdmin) {
        primaryPlayer = player;
        break;
      }
    }
    
    // 如果没有找到管理员选手，使用第一个选手作为主选手
    if (!primaryPlayer) {
      primaryPlayer = sameNamePlayers[0];
    }
    
    // 获取所有比赛历史记录
    const matchHistory = wx.getStorageSync('matchHistory') || [];
    
    // 合并其他同名选手的数据到主选手
    for (const player of sameNamePlayers) {
      if (player.id === primaryPlayer.id) continue; // 跳过主选手自己
      
      // 合并积分，取较高值
      primaryPlayer.score = Math.max(primaryPlayer.score || 1000, player.score || 1000);
      
      // 合并胜负记录
      primaryPlayer.wins = (primaryPlayer.wins || 0) + (player.wins || 0);
      primaryPlayer.losses = (primaryPlayer.losses || 0) + (player.losses || 0);
      
      // 合并单双打胜负记录
      primaryPlayer.singlesWins = (primaryPlayer.singlesWins || 0) + (player.singlesWins || 0);
      primaryPlayer.singlesLosses = (primaryPlayer.singlesLosses || 0) + (player.singlesLosses || 0);
      primaryPlayer.doublesWins = (primaryPlayer.doublesWins || 0) + (player.doublesWins || 0);
      primaryPlayer.doublesLosses = (primaryPlayer.doublesLosses || 0) + (player.doublesLosses || 0);
      
      // 合并特定双打类型的胜负记录
      primaryPlayer.maleDoublesWins = (primaryPlayer.maleDoublesWins || 0) + (player.maleDoublesWins || 0);
      primaryPlayer.maleDoublesLosses = (primaryPlayer.maleDoublesLosses || 0) + (player.maleDoublesLosses || 0);
      primaryPlayer.femaleDoublesWins = (primaryPlayer.femaleDoublesWins || 0) + (player.femaleDoublesWins || 0);
      primaryPlayer.femaleDoublesLosses = (primaryPlayer.femaleDoublesLosses || 0) + (player.femaleDoublesLosses || 0);
      primaryPlayer.mixedDoublesWins = (primaryPlayer.mixedDoublesWins || 0) + (player.mixedDoublesWins || 0);
      primaryPlayer.mixedDoublesLosses = (primaryPlayer.mixedDoublesLosses || 0) + (player.mixedDoublesLosses || 0);
      
      // 更新比赛历史记录中的选手ID，将次选手的ID更新为主选手的ID
      for (const match of matchHistory) {
        // 更新左队选手
        if (match.leftTeam) {
          match.leftTeam.forEach(teamPlayer => {
            if (teamPlayer.id === player.id) {
              teamPlayer.id = primaryPlayer.id;
              teamPlayer.name = primaryPlayer.name;
            }
          });
        }
        
        // 更新右队选手
        if (match.rightTeam) {
          match.rightTeam.forEach(teamPlayer => {
            if (teamPlayer.id === player.id) {
              teamPlayer.id = primaryPlayer.id;
              teamPlayer.name = primaryPlayer.name;
            }
          });
        }
      }
    }
    
    // 重新计算胜率
    const totalWins = (primaryPlayer.singlesWins || 0) + (primaryPlayer.doublesWins || 0);
    const totalLosses = (primaryPlayer.singlesLosses || 0) + (primaryPlayer.doublesLosses || 0);
    const totalMatches = totalWins + totalLosses;
    
    const singlesTotal = (primaryPlayer.singlesWins || 0) + (primaryPlayer.singlesLosses || 0);
    const doublesTotal = (primaryPlayer.doublesWins || 0) + (primaryPlayer.doublesLosses || 0);
    
    primaryPlayer.winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '0%';
    primaryPlayer.singlesWinRate = singlesTotal > 0 ? Math.round((primaryPlayer.singlesWins / singlesTotal) * 100) + '%' : '0%';
    primaryPlayer.doublesWinRate = doublesTotal > 0 ? Math.round((primaryPlayer.doublesWins / doublesTotal) * 100) + '%' : '0%';
    
    // 从选手列表中移除所有同名选手
    let updatedPlayers = allPlayers.filter(p => p.name !== playerName);
    
    // 添加合并后的主选手
    updatedPlayers.push(primaryPlayer);
    
    console.log(`合并前选手数量: ${allPlayers.length}, 合并后选手数量: ${updatedPlayers.length}`);
    console.log(`主选手ID: ${primaryPlayer.id}, 名称: ${primaryPlayer.name}, 分数: ${primaryPlayer.score}`);
    
    // 保存更新后的数据
    wx.setStorageSync('players', updatedPlayers);
    wx.setStorageSync('matchHistory', matchHistory);
    
    // 更新全局数据
    this.globalData.players = updatedPlayers;
    this.globalData.matchHistory = matchHistory;
    
    console.log(`成功合并选手 "${playerName}" 的数据`);
    
    // 检查合并后是否只有一个同名选手
    const checkPlayers = updatedPlayers.filter(p => p.name === playerName);
    console.log(`合并后名为 "${playerName}" 的选手数量: ${checkPlayers.length}`);
    
    return true;
  },
  
  savePlayersData: function(players) {
    this.globalData.players = players;
    wx.setStorageSync('players', players);
  }
}) 