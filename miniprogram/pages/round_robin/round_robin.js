// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    mode: 'singles', // 默认为单打模式
    tournamentType: 'round_robin', // 比赛类型：round_robin(完全循环)或swiss(瑞士轮)
    players: [], // 所有可选择的选手
    selectedPlayers: [], // 已选择的选手
    matchTable: [], // 比赛表格数据
    showPlayerSelectModal: false, // 是否显示选手选择弹窗
    isMatchStarted: false, // 比赛是否已开始
    isMatchEnded: false, // 比赛是否已结束
    currentRound: 1, // 当前轮次（瑞士轮使用）
    totalRounds: 0, // 总轮次（瑞士轮使用）
    playerRankings: [], // 选手排名（瑞士轮使用）
    showAddTempPlayerModal: false, // 是否显示添加临时选手弹窗
    tempPlayerName: '', // 临时选手姓名
    tempPlayerGender: 'male', // 临时选手性别，默认为男
    isDoubles: false, // 是否为双打模式
    showScoreInputModal: false,
    currentMatch: null,
    teamScore: '',
    opponentScore: '',
    activeScoreInput: 'team', // 当前激活的分数输入框，可选值：'team'或'opponent'
    showRankingModal: false, // 是否显示排名结果弹窗
    allMatches: [], // 所有轮次的比赛数据
    showScrollHint: false, // 是否显示滚动提示
    isTableScrollable: false, // 表格是否可滚动
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const mode = options.mode || 'singles';
    const tournamentType = options.tournament_type || 'round_robin';
    
    this.setData({
      mode: mode,
      tournamentType: tournamentType,
      isDoubles: mode === 'doubles'
    });
    
    // 加载选手数据
    this.loadPlayers();
    
    // 检查是否有进行中的比赛
    this.checkOngoingMatch();
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 页面显示时检查表格是否需要滚动
    this.checkTableScrollable();
  },
  
  /**
   * 生命周期函数--监听页面渲染完成
   */
  onReady: function() {
    // 页面渲染完成后检查表格是否需要滚动
    this.checkTableScrollable();
  },
  
  /**
   * 检查表格是否可滚动
   */
  checkTableScrollable: function() {
    if (this.data.isMatchStarted && this.data.selectedPlayers.length > 6) {
      // 当选手数量超过6个时，可能需要滚动
      this.setData({
        showScrollHint: true,
        isTableScrollable: true
      });
      
      // 3秒后自动隐藏滚动提示
      setTimeout(() => {
        this.setData({
          showScrollHint: false
        });
      }, 3000);
    }
  },
  
  /**
   * 处理表格滚动事件
   */
  onTableScroll: function(e) {
    // 滚动时隐藏滚动提示
    if (this.data.showScrollHint) {
      this.setData({
        showScrollHint: false
      });
    }
  },
  
  /**
   * 加载选手数据
   */
  loadPlayers: function() {
    // 从存储中获取最新的选手数据
    const allPlayers = wx.getStorageSync('players') || [];
    // 更新全局数据，确保一致性
    app.globalData.players = allPlayers;
    
    this.setData({
      players: allPlayers
    });
  },
  
  /**
   * 检查是否有进行中的比赛
   */
  checkOngoingMatch: function() {
    const storageKey = this.data.tournamentType === 'swiss' ? 'ongoingSwissMatch' : 'ongoingRoundRobinMatch';
    const ongoingMatch = wx.getStorageSync(storageKey);
    
    if (ongoingMatch && ongoingMatch.mode === this.data.mode) {
      this.setData({
        selectedPlayers: ongoingMatch.players,
        matchTable: ongoingMatch.matchTable,
        isMatchStarted: true,
        currentRound: ongoingMatch.currentRound || 1,
        totalRounds: ongoingMatch.totalRounds || 0,
        playerRankings: ongoingMatch.playerRankings || [],
        allMatches: ongoingMatch.allMatches || []
      });
    }
  },
  
  /**
   * 显示选手选择弹窗
   */
  showPlayerSelect: function() {
    this.setData({
      showPlayerSelectModal: true
    });
  },
  
  /**
   * 隐藏选手选择弹窗
   */
  hidePlayerSelect: function() {
    this.setData({
      showPlayerSelectModal: false
    });
  },
  
  /**
   * 切换选手选择状态
   */
  togglePlayerSelection: function(e) {
    const playerId = e.currentTarget.dataset.id;
    const { selectedPlayers, isDoubles, players } = this.data;
    
    // 查找选手对象
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    // 查找选手是否已被选中
    const index = selectedPlayers.findIndex(p => p.id === playerId);
    
    // 如果是双打模式
    if (isDoubles) {
      // 如果已经选择了4名选手，且当前选手未被选中，则不允许再选
      if (selectedPlayers.length >= 4 && index === -1) {
        wx.showToast({
          title: '双打模式最多选择4名选手',
          icon: 'none'
        });
        return;
      }
      
      // 切换选择状态
      let newSelectedPlayers = [...selectedPlayers];
      if (index !== -1) {
        // 取消选择
        newSelectedPlayers.splice(index, 1);
      } else {
        // 添加选择
        newSelectedPlayers.push(player);
      }
      
      this.setData({
        selectedPlayers: newSelectedPlayers
      });
    } else {
      // 单打模式 - 移除选手数量限制
      // 切换选择状态
      let newSelectedPlayers = [...selectedPlayers];
      if (index !== -1) {
        // 取消选择
        newSelectedPlayers.splice(index, 1);
      } else {
        // 添加选择
        newSelectedPlayers.push(player);
      }
      
      this.setData({
        selectedPlayers: newSelectedPlayers
      });
    }
  },
  
  /**
   * 检查选手是否被选中
   */
  isPlayerSelected: function(playerId) {
    return this.data.selectedPlayers.some(function(player) {
      return player.id === playerId;
    });
  },
  
  /**
   * 确认选手选择
   */
  confirmPlayerSelection: function() {
    const { selectedPlayers, mode, tournamentType } = this.data;
    
    // 检查选手数量
    if (selectedPlayers.length < 2) {
      wx.showToast({
        title: '至少需要2名选手',
        icon: 'none'
      });
      return;
    }
    
    // 如果是双打模式，检查选手数量是否为偶数
    if (mode === 'doubles' && selectedPlayers.length % 2 !== 0) {
      wx.showToast({
        title: '双打模式需要偶数名选手',
        icon: 'none'
      });
      return;
    }

    // 如果是瑞士轮，检查选手数量是否至少为4人
    if (tournamentType === 'swiss') {
      const minPlayers = 4;
      const actualPlayers = mode === 'singles' ? selectedPlayers.length : selectedPlayers.length / 2;
      if (actualPlayers < minPlayers) {
        wx.showModal({
          title: '选手数量不足',
          content: `瑞士轮至少需要${mode === 'singles' ? minPlayers : minPlayers * 2}名选手才能进行有意义的比赛`,
          showCancel: false
        });
        return;
      }
    }

    // 如果是双打模式，组织选手为组合
    if (mode === 'doubles') {
      // 检查是否有足够的男女选手组成混双
      const maleCount = selectedPlayers.filter(p => p.gender === 'male').length;
      const femaleCount = selectedPlayers.filter(p => p.gender === 'female').length;
      
      // 提示性别组合情况
      let pairsInfo = '';
      if (maleCount >= 2 && femaleCount >= 2) {
        pairsInfo = '将组成男双、女双和混双组合';
      } else if (maleCount >= 2) {
        pairsInfo = '将组成男双组合';
      } else if (femaleCount >= 2) {
        pairsInfo = '将组成女双组合';
      } else if (maleCount > 0 && femaleCount > 0) {
        pairsInfo = '将组成混双组合';
      }
      
      wx.showToast({
        title: pairsInfo,
        icon: 'none',
        duration: 2000
      });
    }
    
    // 计算瑞士轮总轮次（如果是瑞士轮）
    if (tournamentType === 'swiss') {
      // 瑞士轮通常为log2(n)向上取整，最多不超过选手数量-1
      const playerCount = mode === 'singles' ? selectedPlayers.length : selectedPlayers.length / 2;
      const totalRounds = Math.min(Math.ceil(Math.log2(playerCount)), playerCount - 1);
      
      this.setData({
        totalRounds: totalRounds
      });
      
      // 初始化选手排名（按照初始分数排序）
      const playerRankings = selectedPlayers.map(player => ({
        ...player,
        wins: 0,
        losses: 0,
        points: 0,
        opponents: []
      })).sort((a, b) => b.score - a.score);
      
      this.setData({
        playerRankings: playerRankings
      });
    }
    
    // 生成比赛表格数据
    this.generateMatchTable();
    
    this.setData({
      showPlayerSelectModal: false,
      isMatchStarted: true
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
    
    // 检查表格是否需要滚动
    setTimeout(() => {
      this.checkTableScrollable();
    }, 500);
  },
  
  /**
   * 生成比赛表格数据
   */
  generateMatchTable: function() {
    const { selectedPlayers, mode, tournamentType, currentRound, playerRankings } = this.data;
    let matchTable = [];
    
    if (tournamentType === 'round_robin') {
      // 完全循环赛
      if (mode === 'singles') {
        // 单打模式
        for (let i = 0; i < selectedPlayers.length; i++) {
          const row = {
            player: selectedPlayers[i],
            matches: []
          };
          
          for (let j = 0; j < selectedPlayers.length; j++) {
            if (i === j) {
              // 自己对自己，显示斜杠
              row.matches.push({
                opponent: selectedPlayers[j],
                score: '/',
                isSelfMatch: true
              });
            } else {
              // 查找是否已有比赛记录
              const existingTable = this.data.matchTable || [];
              const existingRow = existingTable.find(r => r.player.id === selectedPlayers[i].id);
              const existingMatch = existingRow ? existingRow.matches.find(m => m.opponent.id === selectedPlayers[j].id) : null;
              
              row.matches.push({
                opponent: selectedPlayers[j],
                score: existingMatch ? existingMatch.score : '',
                id: `match_${selectedPlayers[i].id}_${selectedPlayers[j].id}`
              });
            }
          }
          
          matchTable.push(row);
        }
      } else {
        // 双打模式
        // 生成所有可能的双打组合
        const teams = [];
          
          // 先将选手按性别分组
          const malePlayers = selectedPlayers.filter(p => p.gender === 'male');
          const femalePlayers = selectedPlayers.filter(p => p.gender === 'female');
          
          // 尽可能组成男双
          for (let i = 0; i < malePlayers.length - 1; i += 2) {
            if (i + 1 < malePlayers.length) {
              teams.push({
                id: `${malePlayers[i].id}_${malePlayers[i + 1].id}`,
                players: [malePlayers[i], malePlayers[i + 1]],
                name: `${malePlayers[i].name}/${malePlayers[i + 1].name}`,
                type: 'male' // 标记为男双
              });
            }
          }
          
          // 尽可能组成女双
          for (let i = 0; i < femalePlayers.length - 1; i += 2) {
            if (i + 1 < femalePlayers.length) {
              teams.push({
                id: `${femalePlayers[i].id}_${femalePlayers[i + 1].id}`,
                players: [femalePlayers[i], femalePlayers[i + 1]],
                name: `${femalePlayers[i].name}/${femalePlayers[i + 1].name}`,
                type: 'female' // 标记为女双
              });
            }
          }
          
          // 剩余的男选手和女选手组成混双
          const remainingMales = malePlayers.length % 2 === 1 ? [malePlayers[malePlayers.length - 1]] : [];
          const remainingFemales = femalePlayers.length % 2 === 1 ? [femalePlayers[femalePlayers.length - 1]] : [];
          
          const minCount = Math.min(remainingMales.length, remainingFemales.length);
          for (let i = 0; i < minCount; i++) {
          teams.push({
              id: `${remainingMales[i].id}_${remainingFemales[i].id}`,
              players: [remainingMales[i], remainingFemales[i]],
              name: `${remainingMales[i].name}/${remainingFemales[i].name}`,
              type: 'mixed' // 标记为混双
            });
          }
          
          // 如果还有剩余选手，两两组合
          const allRemaining = [...remainingMales.slice(minCount), ...remainingFemales.slice(minCount)];
          for (let i = 0; i < allRemaining.length - 1; i += 2) {
            if (i + 1 < allRemaining.length) {
              const type = allRemaining[i].gender === allRemaining[i + 1].gender ? 
                          (allRemaining[i].gender === 'male' ? 'male' : 'female') : 'mixed';
              teams.push({
                id: `${allRemaining[i].id}_${allRemaining[i + 1].id}`,
                players: [allRemaining[i], allRemaining[i + 1]],
                name: `${allRemaining[i].name}/${allRemaining[i + 1].name}`,
                type: type
              });
            }
          }
        
        for (let i = 0; i < teams.length; i++) {
          const row = {
            team: teams[i],
            matches: []
          };
          
          for (let j = 0; j < teams.length; j++) {
            if (i === j) {
              // 自己对自己，显示斜杠
              row.matches.push({
                opponent: teams[j],
                score: '/',
                isSelfMatch: true
              });
            } else {
              // 查找是否已有比赛记录
              const existingTable = this.data.matchTable || [];
              const existingRow = existingTable.find(r => r.team && r.team.id === teams[i].id);
              const existingMatch = existingRow ? existingRow.matches.find(m => m.opponent.id === teams[j].id) : null;
              
              row.matches.push({
                opponent: teams[j],
                score: existingMatch ? existingMatch.score : '',
                id: `match_${teams[i].id}_${teams[j].id}`
              });
            }
          }
          
          matchTable.push(row);
        }
      }
    } else {
      // 瑞士轮比赛 - 使用generateSwissRoundMatches函数
      if (currentRound === 1) {
        // 第一轮使用selectedPlayers生成初始排名
        let initialRankings = [];
        
        if (mode === 'singles') {
          // 单打模式 - 使用selectedPlayers
          initialRankings = selectedPlayers.map(player => ({
            ...player,
            wins: 0,
            losses: 0,
            ties: 0,
            points: 0,
            opponents: []
          })).sort((a, b) => b.score - a.score);
          
          // 更新playerRankings
          this.setData({
            playerRankings: initialRankings
          });
        } else {
          // 双打模式 - 生成队伍
          const teams = [];
          for (let i = 0; i < selectedPlayers.length; i += 2) {
            if (i + 1 < selectedPlayers.length) {
              teams.push({
                id: `${selectedPlayers[i].id}_${selectedPlayers[i + 1].id}`,
                players: [selectedPlayers[i], selectedPlayers[i + 1]],
                name: `${selectedPlayers[i].name}/${selectedPlayers[i + 1].name}`,
                wins: 0,
                losses: 0,
                ties: 0,
                points: 0,
                opponents: []
              });
            }
          }
          
          initialRankings = teams;
          
          // 更新playerRankings
          this.setData({
            playerRankings: initialRankings
          });
        }
        
        // 生成第一轮比赛
        matchTable = this.generateSwissRoundMatches(initialRankings, 1);
      } else {
        // 后续轮次使用playerRankings
        matchTable = this.generateSwissRoundMatches(playerRankings, currentRound);
      }
    }
    
    this.setData({
      matchTable: matchTable
    });
  },
  
  /**
   * 保存进行中的比赛
   */
  saveOngoingMatch: function() {
    const { selectedPlayers, matchTable, mode, tournamentType, currentRound, totalRounds, playerRankings, allMatches } = this.data;
    
    const storageKey = tournamentType === 'swiss' ? 'ongoingSwissMatch' : 'ongoingRoundRobinMatch';
    
    // 如果是瑞士轮，保留之前的所有比赛记录
    if (tournamentType === 'swiss') {
      // 获取存储中的数据
      const ongoingMatch = wx.getStorageSync(storageKey) || {};
      
      // 确保不会丢失之前轮次的比赛记录
      let mergedAllMatches = [];
      
      // 如果当前的allMatches不为空，优先使用当前的
      if (this.data.allMatches && this.data.allMatches.length > 0) {
        mergedAllMatches = [...this.data.allMatches];
      } 
      // 如果存储中有数据且当前allMatches为空，使用存储中的
      else if (ongoingMatch.allMatches && ongoingMatch.allMatches.length > 0) {
        mergedAllMatches = [...ongoingMatch.allMatches];
      }
      
      // 添加当前轮次的比赛记录（如果不在mergedAllMatches中）
      const currentRoundMatches = matchTable.filter(match => match.winner).map(match => ({
        ...match,
        round: currentRound
      }));
      
      // 检查当前轮次的比赛是否已经在mergedAllMatches中
      for (const match of currentRoundMatches) {
        const matchExists = mergedAllMatches.some(m => 
          m.round === match.round && 
          ((m.player1 && match.player1 && m.player1.id === match.player1.id && 
            m.player2 && match.player2 && m.player2.id === match.player2.id) || 
           (m.team1 && match.team1 && m.team1.id === match.team1.id && 
            m.team2 && match.team2 && m.team2.id === match.team2.id))
        );
        
        if (!matchExists) {
          mergedAllMatches.push(match);
        }
      }
      
      // 更新组件状态
      this.setData({
        allMatches: mergedAllMatches
      });
      
      // 保存到本地存储
      wx.setStorageSync(storageKey, {
        mode: mode,
        tournamentType: tournamentType,
        players: selectedPlayers,
        matchTable: matchTable,
        currentRound: currentRound,
        totalRounds: totalRounds,
        playerRankings: playerRankings,
        allMatches: mergedAllMatches, // 使用合并后的比赛数据
        updateTime: new Date().toISOString()
      });
    } else {
      wx.setStorageSync(storageKey, {
        mode: mode,
        tournamentType: tournamentType,
        players: selectedPlayers,
        matchTable: matchTable,
        currentRound: currentRound,
        totalRounds: totalRounds,
        playerRankings: playerRankings,
        allMatches: allMatches,
        updateTime: new Date().toISOString()
      });
    }
  },
  
  /**
   * 输入比分
   */
  inputScore: function(e) {
    const { row, col } = e.currentTarget.dataset;
    // 获取分数，优先从dataset.score获取，如果没有则从detail.value获取
    const score = e.currentTarget.dataset.score || e.detail.value;
    
    // 更新比分
    const matchTable = [...this.data.matchTable];
    matchTable[row].matches[col].score = score;
    
    // 同时更新对应的反向比分
    const player1 = matchTable[row].player || matchTable[row].team;
    const player2 = matchTable[row].matches[col].opponent;
    
    const reverseRow = matchTable.findIndex(r => 
      (r.player && r.player.id === player2.id) || 
      (r.team && r.team.id === player2.id)
    );
    
    const reverseCol = matchTable[reverseRow].matches.findIndex(m => 
      (m.opponent.id === player1.id)
    );
    
    // 反转比分 - 例如：如果A对B的比分是21:0，则B对A的比分应该是0:21
    if (score && score.includes(':')) {
      const scores = score.split(':');
      if (scores.length === 2) {
        const reverseScore = `${scores[1]}:${scores[0]}`;
        matchTable[reverseRow].matches[reverseCol].score = reverseScore;
      } else {
        // 如果格式不正确，直接复制
        matchTable[reverseRow].matches[reverseCol].score = score;
      }
    } else {
      // 如果格式不正确，直接复制
      matchTable[reverseRow].matches[reverseCol].score = score;
    }
    
    this.setData({
      matchTable: matchTable
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 输入瑞士轮比赛比分
   */
  inputSwissScore: function(e) {
    const matchIndex = e.currentTarget.dataset.matchIndex;
    const score = e.detail.value;
    
    // 更新比分
    const matchTable = [...this.data.matchTable];
    matchTable[matchIndex].score = score;
    
    // 解析比分
    const scores = score.split(':');
    if (scores.length === 2) {
      const leftScore = parseInt(scores[0]);
      const rightScore = parseInt(scores[1]);
      
      if (!isNaN(leftScore) && !isNaN(rightScore)) {
        if (leftScore > rightScore) {
          matchTable[matchIndex].winner = 'player1';
        } else if (rightScore > leftScore) {
          matchTable[matchIndex].winner = 'player2';
        } else {
          matchTable[matchIndex].winner = 'tie';
        }
      }
    }
    
    this.setData({
      matchTable: matchTable
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 进入下一轮
   */
  nextRound: function() {
    const { matchTable, currentRound, totalRounds, mode } = this.data;
    
    // 检查当前轮次是否所有比赛都已完成
    const allMatchesCompleted = matchTable.every(match => match.winner);
    
    if (!allMatchesCompleted) {
      wx.showModal({
        title: '未完成比赛',
        content: '当前轮次还有未完成的比赛，确定要继续吗？',
        success: (res) => {
          if (res.confirm) {
            this.processCurrentRound();
          }
        }
      });
    } else {
      this.processCurrentRound();
    }
  },
  
  /**
   * 处理当前轮次结果并进入下一轮
   */
  processCurrentRound: function() {
    const { matchTable, currentRound, mode, playerRankings, tournamentType, allMatches } = this.data;
    
    // 更新选手排名
    const updatedRankings = [...playerRankings];
    
    // 确保所有选手的胜负场次和积分都被正确初始化
    for (let i = 0; i < updatedRankings.length; i++) {
      updatedRankings[i].wins = updatedRankings[i].wins || 0;
      updatedRankings[i].losses = updatedRankings[i].losses || 0;
      updatedRankings[i].points = updatedRankings[i].points || 0;
      updatedRankings[i].opponents = updatedRankings[i].opponents || [];
    }
    
    // 处理本轮比赛结果
    for (const match of matchTable) {
      // 跳过没有结果的比赛
      if (!match.winner) continue;
      
      if (mode === 'singles') {
        // 单打模式
        const player1Index = updatedRankings.findIndex(p => p.id === match.player1.id);
        const player2Index = updatedRankings.findIndex(p => p.id === match.player2.id);
        
        if (player1Index !== -1 && player2Index !== -1) {
          // 记录对手
          updatedRankings[player1Index].opponents.push(match.player2.id);
          updatedRankings[player2Index].opponents.push(match.player1.id);
          
          if (match.winner === 'player1') {
            updatedRankings[player1Index].wins++;
            updatedRankings[player1Index].points += 1;
            updatedRankings[player2Index].losses++;
          } else if (match.winner === 'player2') {
            updatedRankings[player2Index].wins++;
            updatedRankings[player2Index].points += 1;
            updatedRankings[player1Index].losses++;
          } else if (match.winner === 'tie') {
            updatedRankings[player1Index].points += 1;
            updatedRankings[player2Index].points += 1;
          }
        }
      } else {
        // 双打模式
        const team1Index = updatedRankings.findIndex(t => t.id === match.team1.id);
        const team2Index = updatedRankings.findIndex(t => t.id === match.team2.id);
        
        if (team1Index !== -1 && team2Index !== -1) {
          // 记录对手
          updatedRankings[team1Index].opponents.push(match.team2.id);
          updatedRankings[team2Index].opponents.push(match.team1.id);
          
          if (match.winner === 'player1') {
            updatedRankings[team1Index].wins++;
            updatedRankings[team1Index].points += 1;
            updatedRankings[team2Index].losses++;
          } else if (match.winner === 'player2') {
            updatedRankings[team2Index].wins++;
            updatedRankings[team2Index].points += 1;
            updatedRankings[team1Index].losses++;
          } else if (match.winner === 'tie') {
            updatedRankings[team1Index].points += 1;
            updatedRankings[team2Index].points += 1;
          }
        }
      }
    }
    
    // 按积分和胜场排序
    updatedRankings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return 0;
    });
    
    // 将当前轮次的有效比赛添加到allMatches
    const currentRoundMatches = matchTable.filter(match => match.winner).map(match => ({
      ...match,
      round: currentRound
    }));
    
    // 获取存储中的历史比赛数据
    let existingMatches = [];
    if (tournamentType === 'swiss') {
      const storageKey = 'ongoingSwissMatch';
      const ongoingMatch = wx.getStorageSync(storageKey) || {};
      existingMatches = ongoingMatch.allMatches || [];
    }
    
    // 合并历史比赛和当前比赛，确保不重复
    let updatedAllMatches = [...allMatches];
    
    // 添加当前轮次的比赛（如果不在updatedAllMatches中）
    for (const match of currentRoundMatches) {
      const matchExists = updatedAllMatches.some(m => 
        m.round === match.round && 
        ((m.player1 && match.player1 && m.player1.id === match.player1.id && 
          m.player2 && match.player2 && m.player2.id === match.player2.id) || 
         (m.team1 && match.team1 && m.team1.id === match.team1.id && 
          m.team2 && match.team2 && m.team2.id === match.team2.id))
      );
      
      if (!matchExists) {
        updatedAllMatches.push(match);
      }
    }
    
    // 生成下一轮比赛
    const nextRound = currentRound + 1;
    const newMatchTable = this.generateSwissRoundMatches(updatedRankings, nextRound);
    
    this.setData({
      playerRankings: updatedRankings,
      currentRound: nextRound,
      matchTable: newMatchTable,
      allMatches: updatedAllMatches // 更新allMatches
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 结束比赛
   */
  endMatch: function() {
    const that = this;
    wx.showModal({
      title: '确认结束比赛',
      content: '结束比赛后将无法继续记分，确定要结束吗？',
      success: function(res) {
        if (res.confirm) {
          // 如果是瑞士轮比赛，确保当前轮次的比赛也被保存到 allMatches 中
          let allMatches = [];
          if (that.data.tournamentType === 'swiss') {
            const storageKey = 'ongoingSwissMatch';
            const ongoingMatch = wx.getStorageSync(storageKey) || {};
            allMatches = ongoingMatch.allMatches || [];
            
            // 将当前轮次的有效比赛添加到 allMatches
            const currentRoundMatches = that.data.matchTable.filter(match => match.winner).map(match => ({
              ...match,
              round: that.data.currentRound
            }));
            
            // 更新 allMatches，确保不重复添加比赛
            for (const match of currentRoundMatches) {
              const matchExists = allMatches.some(m => 
                m.round === match.round && 
                ((m.player1 && match.player1 && m.player1.id === match.player1.id && 
                  m.player2 && match.player2 && m.player2.id === match.player2.id) || 
                 (m.team1 && match.team1 && m.team1.id === match.team1.id && 
                  m.team2 && match.team2 && m.team2.id === match.team2.id))
              );
              
              if (!matchExists) {
                allMatches.push(match);
              }
            }
          } else {
            // 如果是完全循环赛，使用matchTable数据
            allMatches = that.data.allMatches;
          }
          
          // 更新组件状态，确保所有比赛数据都被保存
          that.setData({
            allMatches: allMatches
          });
          
          // 处理比赛结果
          that.processMatchResults();
          
          // 清除进行中的比赛
          const storageKey = that.data.tournamentType === 'swiss' ? 'ongoingSwissMatch' : 'ongoingRoundRobinMatch';
          wx.removeStorageSync(storageKey);
          
          // 计算并显示排名结果（无论是瑞士轮还是完全循环赛）
          if (that.data.tournamentType === 'swiss') {
            // 使用所有轮次的比赛数据计算最终排名
            const finalRankings = that.calculateFinalRankings(allMatches);
            
            // 设置最终排名数据
            that.setData({
              playerRankings: finalRankings,
              allMatches: allMatches // 保存所有比赛数据到组件状态中
            });
            that.showRankingModal();
          } else {
            // 完全循环赛 - 从matchTable计算最终排名
            const matchTableData = that.data.matchTable;
            const finalRankings = that.calculateFinalRankingsForRoundRobin(matchTableData);
            
            // 设置最终排名数据
            that.setData({
              playerRankings: finalRankings
            });
            that.showRankingModal();
          }
        }
      }
    });
  },
  
  /**
   * 为完全循环赛计算最终排名
   * @param {Array} matchTableData 比赛表格数据
   * @returns {Array} 最终排名结果
   */
  calculateFinalRankingsForRoundRobin: function(matchTableData) {
    const { mode } = this.data;
    let rankings = [];
    
    if (mode === 'singles') {
      // 单打模式 - 从matchTable提取选手数据
      const playerMap = new Map();
      
      // 初始化选手统计
      for (const row of matchTableData) {
        const player = row.player;
        if (!playerMap.has(player.id)) {
          playerMap.set(player.id, {
            ...player,
            wins: 0,
            losses: 0,
            ties: 0,
            points: 0,
            scoreDiff: 0,
            netWins: 0
          });
        }
        
        // 统计比赛结果
        for (const match of row.matches) {
          if (match.isSelfMatch || !match.score || match.score === '/') continue;
          
          const scores = match.score.split(':');
          if (scores.length !== 2) continue;
          
          const leftScore = parseInt(scores[0]);
          const rightScore = parseInt(scores[1]);
          
          if (isNaN(leftScore) || isNaN(rightScore)) continue;
          
          const playerStats = playerMap.get(player.id);
          const opponent = match.opponent;
          
          if (leftScore > rightScore) {
            playerStats.wins++;
            playerStats.scoreDiff += Math.abs(leftScore - rightScore); // 胜利方加上分差
          } else if (rightScore > leftScore) {
            playerStats.losses++;
            playerStats.scoreDiff -= Math.abs(leftScore - rightScore); // 失败方减去分差
          } else {
            playerStats.ties = (playerStats.ties || 0) + 1;
          }
          
          // 计算净胜场
          playerStats.netWins = playerStats.wins - playerStats.losses;
        }
      }
      
      rankings = Array.from(playerMap.values());
    } else {
      // 双打模式 - 从matchTable提取队伍数据
      const teamMap = new Map();
      
      // 初始化队伍统计
      for (const row of matchTableData) {
        const team = row.team;
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, {
            ...team,
            wins: 0,
            losses: 0,
            ties: 0,
            points: 0,
            scoreDiff: 0,
            netWins: 0
          });
        }
        
        // 统计比赛结果
        for (const match of row.matches) {
          if (match.isSelfMatch || !match.score || match.score === '/') continue;
          
          const scores = match.score.split(':');
          if (scores.length !== 2) continue;
          
          const leftScore = parseInt(scores[0]);
          const rightScore = parseInt(scores[1]);
          
          if (isNaN(leftScore) || isNaN(rightScore)) continue;
          
          const teamStats = teamMap.get(team.id);
          const opponent = match.opponent;
          
          if (leftScore > rightScore) {
            teamStats.wins++;
            teamStats.scoreDiff += Math.abs(leftScore - rightScore); // 胜利方加上分差
          } else if (rightScore > leftScore) {
            teamStats.losses++;
            teamStats.scoreDiff -= Math.abs(leftScore - rightScore); // 失败方减去分差
          } else {
            teamStats.ties = (teamStats.ties || 0) + 1;
          }
          
          // 计算净胜场
          teamStats.netWins = teamStats.wins - teamStats.losses;
        }
      }
      
      rankings = Array.from(teamMap.values());
    }
    
    // 按净胜场和净胜分排序
    rankings.sort((a, b) => {
      if (a.netWins !== b.netWins) return b.netWins - a.netWins;
      if (a.scoreDiff !== b.scoreDiff) return b.scoreDiff - a.scoreDiff;
      return 0;
    });
    
    return rankings;
  },
  
  /**
   * 显示排名结果弹窗
   */
  showRankingModal: function() {
    // 从当前比赛数据中重新计算排名
    let rankings = [];
    
    if (this.data.tournamentType === 'swiss') {
      // 瑞士轮比赛 - 使用allMatches计算
      const allMatches = this.data.allMatches || [];
      rankings = this.calculateFinalRankings(allMatches);
    } else {
      // 完全循环赛 - 从matchTable计算
      const matchTableData = this.data.matchTable;
      rankings = this.calculateFinalRankingsForRoundRobin(matchTableData);
    }
    
    // 更新页面状态
    this.setData({
      showRankingModal: true,
      playerRankings: rankings
    });
  },
  
  /**
   * 计算最终排名
   * @param {Array} allMatches 所有轮次的比赛数据
   * @returns {Array} 最终排名结果
   */
  calculateFinalRankings: function(allMatches) {
    const { mode, selectedPlayers } = this.data;
    
    // 初始化排名数据
    let rankings = [];
    
    if (mode === 'singles') {
      // 单打模式
      rankings = selectedPlayers.map(player => ({
        ...player,
        wins: 0,
        losses: 0,
        ties: 0,
        points: 0,
        scoreDiff: 0,
        netWins: 0,
        matches: []
      }));
    } else {
      // 双打模式 - 需要从比赛数据中提取队伍信息
      const teamsMap = new Map();
      
      // 从比赛数据中提取所有队伍
      allMatches.forEach(match => {
        if (match.team1 && !teamsMap.has(match.team1.id)) {
          teamsMap.set(match.team1.id, {
            ...match.team1,
            wins: 0,
            losses: 0,
            ties: 0,
            points: 0,
            scoreDiff: 0,
            netWins: 0,
            matches: []
          });
        }
        
        if (match.team2 && !teamsMap.has(match.team2.id)) {
          teamsMap.set(match.team2.id, {
            ...match.team2,
            wins: 0,
            losses: 0,
            ties: 0,
            points: 0,
            scoreDiff: 0,
            netWins: 0,
            matches: []
          });
        }
      });
      
      rankings = Array.from(teamsMap.values());
    }
    
    // 处理所有比赛结果
    allMatches.forEach(match => {
      // 跳过没有结果的比赛
      if (!match.winner) return;
      
      // 解析比分
      let leftScore = 0;
      let rightScore = 0;
      if (match.score && match.score.includes(':')) {
        const scores = match.score.split(':');
        leftScore = parseInt(scores[0]) || 0;
        rightScore = parseInt(scores[1]) || 0;
      }
      
      if (mode === 'singles') {
        // 单打模式
        const player1Index = rankings.findIndex(p => p.id === match.player1.id);
        const player2Index = rankings.findIndex(p => p.id === match.player2.id);
        
        if (player1Index !== -1 && player2Index !== -1) {
          // 记录比赛
          rankings[player1Index].matches.push({
            opponent: match.player2.id,
            result: match.winner === 'player1' ? 'win' : (match.winner === 'player2' ? 'loss' : 'tie'),
            score: match.score,
            round: match.round || 1
          });
          
          rankings[player2Index].matches.push({
            opponent: match.player1.id,
            result: match.winner === 'player2' ? 'win' : (match.winner === 'player1' ? 'loss' : 'tie'),
            score: match.score,
            round: match.round || 1
          });
          
          // 更新胜负场次和积分
          if (match.winner === 'player1') {
            rankings[player1Index].wins++;
            rankings[player1Index].scoreDiff += Math.abs(leftScore - rightScore); // 胜利方加上分差
            rankings[player2Index].losses++;
            rankings[player2Index].scoreDiff -= Math.abs(leftScore - rightScore); // 失败方减去分差
          } else if (match.winner === 'player2') {
            rankings[player2Index].wins++;
            rankings[player2Index].scoreDiff += Math.abs(leftScore - rightScore); // 胜利方加上分差
            rankings[player1Index].losses++;
            rankings[player1Index].scoreDiff -= Math.abs(leftScore - rightScore); // 失败方减去分差
          } else if (match.winner === 'tie') {
            rankings[player1Index].ties = (rankings[player1Index].ties || 0) + 1;
            rankings[player2Index].ties = (rankings[player2Index].ties || 0) + 1;
          }
          
          // 计算净胜场
          rankings[player1Index].netWins = rankings[player1Index].wins - rankings[player1Index].losses;
          rankings[player2Index].netWins = rankings[player2Index].wins - rankings[player2Index].losses;
        }
      } else {
        // 双打模式
        const team1Index = rankings.findIndex(t => t.id === match.team1.id);
        const team2Index = rankings.findIndex(t => t.id === match.team2.id);
        
        if (team1Index !== -1 && team2Index !== -1) {
          // 记录比赛
          rankings[team1Index].matches.push({
            opponent: match.team2.id,
            result: match.winner === 'player1' ? 'win' : (match.winner === 'player2' ? 'loss' : 'tie'),
            score: match.score,
            round: match.round || 1
          });
          
          rankings[team2Index].matches.push({
            opponent: match.team1.id,
            result: match.winner === 'player2' ? 'win' : (match.winner === 'player1' ? 'loss' : 'tie'),
            score: match.score,
            round: match.round || 1
          });
          
          // 更新胜负场次和积分
          if (match.winner === 'player1') {
            rankings[team1Index].wins++;
            rankings[team1Index].scoreDiff += Math.abs(leftScore - rightScore); // 胜利方加上分差
            rankings[team2Index].losses++;
            rankings[team2Index].scoreDiff -= Math.abs(leftScore - rightScore); // 失败方减去分差
          } else if (match.winner === 'player2') {
            rankings[team2Index].wins++;
            rankings[team2Index].scoreDiff += Math.abs(leftScore - rightScore); // 胜利方加上分差
            rankings[team1Index].losses++;
            rankings[team1Index].scoreDiff -= Math.abs(leftScore - rightScore); // 失败方减去分差
          } else if (match.winner === 'tie') {
            rankings[team1Index].ties = (rankings[team1Index].ties || 0) + 1;
            rankings[team2Index].ties = (rankings[team2Index].ties || 0) + 1;
          }
          
          // 计算净胜场
          rankings[team1Index].netWins = rankings[team1Index].wins - rankings[team1Index].losses;
          rankings[team2Index].netWins = rankings[team2Index].wins - rankings[team2Index].losses;
        }
      }
    });
    
    // 按净胜场和净胜分排序
    rankings.sort((a, b) => {
      if (a.netWins !== b.netWins) return b.netWins - a.netWins;
      if (a.scoreDiff !== b.scoreDiff) return b.scoreDiff - a.scoreDiff;
      return 0;
    });
    
    return rankings;
  },
  
  /**
   * 隐藏排名结果弹窗
   */
  hideRankingModal: function() {
    this.setData({
      showRankingModal: false
    });
  },
  
  /**
   * 确认排名结果
   */
  confirmRanking: function() {
    // 如果是从结束比赛进入的排名弹窗，则返回主页
    if (!wx.getStorageSync('ongoingRoundRobinMatch') && !wx.getStorageSync('ongoingSwissMatch')) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
    
    this.hideRankingModal();
  },
  
  /**
   * 处理比赛结果
   */
  processMatchResults: function() {
    const { matchTable, mode, tournamentType, currentRound, playerRankings, allMatches } = this.data;
    const matchHistory = [];
    
    // 添加检查临时选手的辅助函数
    const hasTemporaryPlayer = (players) => {
      return players.some(player => player.isTemporary === true);
    };
    
    if (tournamentType === 'round_robin') {
      // 完全循环赛
      // 遍历比赛表格，提取有效比赛结果
      for (let i = 0; i < matchTable.length; i++) {
        for (let j = 0; j < matchTable[i].matches.length; j++) {
          const match = matchTable[i].matches[j];
          
          // 跳过自己对自己的比赛和没有比分的比赛
          if (match.score === '-' || match.score === '') continue;
          
          // 跳过已处理过的比赛（避免重复）
          if (i > j) continue;
          
          // 解析比分
          const scores = match.score.split(':');
          if (scores.length !== 2) continue;
          
          const leftScore = parseInt(scores[0]);
          const rightScore = parseInt(scores[1]);
          
          if (isNaN(leftScore) || isNaN(rightScore)) continue;
          
          // 创建比赛记录
          let matchRecord;
          let leftTeamPlayers, rightTeamPlayers;
          
          if (mode === 'singles') {
            leftTeamPlayers = [matchTable[i].player];
            rightTeamPlayers = [match.opponent];
            
            matchRecord = {
              id: Date.now().toString() + '_' + i + '_' + j,
              date: new Date().toISOString(),
              leftTeam: leftTeamPlayers,
              rightTeam: rightTeamPlayers,
              leftScore: leftScore,
              rightScore: rightScore,
              winner: leftScore > rightScore ? 'left' : 'right'
            };
          } else {
            leftTeamPlayers = matchTable[i].team.players;
            rightTeamPlayers = match.opponent.players;
            
            matchRecord = {
              id: Date.now().toString() + '_' + i + '_' + j,
              date: new Date().toISOString(),
              leftTeam: leftTeamPlayers,
              rightTeam: rightTeamPlayers,
              leftScore: leftScore,
              rightScore: rightScore,
              winner: leftScore > rightScore ? 'left' : 'right'
            };
          }
          
          // 检查是否包含临时选手，如果包含则不记录
          if (hasTemporaryPlayer(leftTeamPlayers) || hasTemporaryPlayer(rightTeamPlayers)) {
            continue;
          }
          
          // 使用ELO系统更新积分
          const scoreChanges = app.submitMatch(matchRecord);
          
          // 将积分变化值添加到比赛记录中
          matchRecord.winnerChange = scoreChanges.winnerChange;
          matchRecord.loserChange = scoreChanges.loserChange;
          
          // 添加到历史记录
          matchHistory.push(matchRecord);
        }
      }
    } else {
      // 瑞士轮比赛
      // 使用组件状态中的allMatches，确保包含所有轮次的比赛
      const allRoundMatches = this.data.allMatches || [];
      
      // 确保allMatches不为空
      if (allRoundMatches.length === 0) {
        console.warn('警告：allMatches为空，可能导致历史记录不完整');
        
        // 尝试从本地存储获取
        const ongoingMatch = wx.getStorageSync('ongoingSwissMatch') || {};
        const storedMatches = ongoingMatch.allMatches || [];
        
        // 如果本地存储中有数据，使用它
        if (storedMatches.length > 0) {
          console.log('从本地存储恢复了' + storedMatches.length + '场比赛记录');
          allRoundMatches.push(...storedMatches);
        }
        
        // 添加当前轮次的比赛
        const currentRoundMatches = matchTable.filter(match => match.winner).map(match => ({
          ...match,
          round: currentRound
        }));
        
        allRoundMatches.push(...currentRoundMatches);
      }
      
      console.log('处理瑞士轮比赛结果，共' + allRoundMatches.length + '场比赛');
      
      // 处理所有轮次的比赛
      for (const match of allRoundMatches) {
        // 跳过没有比分的比赛
        if (!match.score || !match.winner) continue;
        
        // 解析比分
        const scores = match.score.split(':');
        if (scores.length !== 2) continue;
        
        const leftScore = parseInt(scores[0]);
        const rightScore = parseInt(scores[1]);
        
        if (isNaN(leftScore) || isNaN(rightScore)) continue;
        
        // 创建比赛记录
        let matchRecord;
        let leftTeamPlayers, rightTeamPlayers;
        const matchRound = match.round || 1; // 确保有轮次信息
        
        if (mode === 'singles') {
          leftTeamPlayers = [match.player1];
          rightTeamPlayers = [match.player2];
          
          matchRecord = {
            id: Date.now().toString() + '_' + match.player1.id + '_' + match.player2.id + '_round' + matchRound,
            date: new Date().toISOString(),
            leftTeam: leftTeamPlayers,
            rightTeam: rightTeamPlayers,
            leftScore: leftScore,
            rightScore: rightScore,
            winner: match.winner === 'player1' ? 'left' : 'right',
            round: matchRound // 添加轮次信息
          };
        } else {
          leftTeamPlayers = match.team1.players;
          rightTeamPlayers = match.team2.players;
          
          matchRecord = {
            id: Date.now().toString() + '_' + match.team1.id + '_' + match.team2.id + '_round' + matchRound,
            date: new Date().toISOString(),
            leftTeam: leftTeamPlayers,
            rightTeam: rightTeamPlayers,
            leftScore: leftScore,
            rightScore: rightScore,
            winner: match.winner === 'player1' ? 'left' : 'right',
            round: matchRound // 添加轮次信息
          };
        }
        
        // 检查是否包含临时选手，如果包含则不记录
        if (hasTemporaryPlayer(leftTeamPlayers) || hasTemporaryPlayer(rightTeamPlayers)) {
          continue;
        }
        
        // 使用ELO系统更新积分
        const scoreChanges = app.submitMatch(matchRecord);
        
        // 将积分变化值添加到比赛记录中
        matchRecord.winnerChange = scoreChanges.winnerChange;
        matchRecord.loserChange = scoreChanges.loserChange;
        
        // 添加到历史记录
        matchHistory.push(matchRecord);
      }
    }
    
    // 更新全局比赛记录
    const allMatchHistory = [...app.globalData.matchHistory, ...matchHistory];
    app.globalData.matchHistory = allMatchHistory;
    
    // 保存到本地存储
    wx.setStorageSync('matchHistory', allMatchHistory);
    
    // 输出处理结果
    console.log('处理了' + matchHistory.length + '场比赛，总历史记录数：' + allMatchHistory.length);
  },

  /**
   * 显示添加临时选手弹窗
   */
  showAddTempPlayerModal: function() {
    this.setData({
      showAddTempPlayerModal: true,
      tempPlayerName: '',
      tempPlayerGender: 'male'
    });
  },

  /**
   * 隐藏添加临时选手弹窗
   */
  hideAddTempPlayerModal: function() {
    this.setData({
      showAddTempPlayerModal: false
    });
  },

  /**
   * 监听临时选手姓名输入
   */
  onTempPlayerNameInput: function(e) {
    this.setData({
      tempPlayerName: e.detail.value
    });
  },

  /**
   * 选择临时选手性别
   */
  selectTempPlayerGender: function(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      tempPlayerGender: gender
    });
  },

  /**
   * 添加临时选手
   */
  addTempPlayer: function() {
    const { tempPlayerName, tempPlayerGender, players } = this.data;
    
    // 验证姓名
    if (!tempPlayerName.trim()) {
      wx.showToast({
        title: '请输入选手姓名',
        icon: 'none'
      });
      return;
    }
    
    // 检查名称是否与已注册选手重复（从全局获取所有注册选手）
    const allRegisteredPlayers = app.globalData.players || [];
    const nameExistsInRegistered = allRegisteredPlayers.some(player => player.name === tempPlayerName);
    
    // 如果名字与已注册选手重复，提示用户并阻止添加
    if (nameExistsInRegistered) {
      wx.showToast({
        title: '该名字与已注册选手重复，请使用其他名字',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查名称是否与当前选手列表重复
    const nameExists = players.some(player => player.name === tempPlayerName);
    
    // 创建临时选手对象，添加(临)标识
    const displayName = nameExists ? `${tempPlayerName}(临)` : `${tempPlayerName}(临)`;
    
    const tempPlayer = {
      id: 'temp_' + Date.now(),
      name: displayName,
      gender: tempPlayerGender,
      score: 1000, // 默认分数
      avatarUrl: tempPlayerGender === 'female' ? '/images/default-avatar-female.png' : '/images/default-avatar.png',
      isTemporary: true
    };
    
    // 添加到选手列表和已选择列表
    const updatedPlayers = [...this.data.players, tempPlayer];
    const updatedSelectedPlayers = [...this.data.selectedPlayers, tempPlayer];
    
    this.setData({
      players: updatedPlayers,
      selectedPlayers: updatedSelectedPlayers,
      showAddTempPlayerModal: false
    });
    
    wx.showToast({
      title: '临时选手已添加',
      icon: 'success'
    });
  },

  /**
   * 显示比分输入弹窗
   */
  showScoreInputModal: function(e) {
    const row = e.currentTarget.dataset.row;
    const col = e.currentTarget.dataset.col;
    const matchIndex = e.currentTarget.dataset.matchIndex;
    
    // 判断是否为瑞士轮比赛
    if (this.data.tournamentType === 'swiss') {
      // 获取瑞士轮比赛数据
      const match = this.data.matchTable[matchIndex];
      const team = this.data.mode === 'singles' ? match.player1 : match.team1;
      const opponent = this.data.mode === 'singles' ? match.player2 : match.team2;
      
      // 解析已有的比分
      let teamScore = '';
      let opponentScore = '';
      if (match.score && match.score.includes(':')) {
        const scores = match.score.split(':');
        teamScore = scores[0];
        opponentScore = scores[1];
      }
      
      this.setData({
        showScoreInputModal: true,
        currentMatch: {
          matchIndex: matchIndex,
          team: team,
          opponent: opponent,
          isSwiss: true
        },
        teamScore: teamScore,
        opponentScore: opponentScore,
        activeScoreInput: 'team' // 默认激活队伍分数输入框
      });
    } else {
      // 获取对应的比赛数据
      const match = this.data.matchTable[row].matches[col];
      const team = this.data.matchTable[row].player || this.data.matchTable[row].team;
      const opponent = match.opponent;
      
      // 解析已有的比分
      let teamScore = '';
      let opponentScore = '';
      if (match.score && match.score.includes(':')) {
        const scores = match.score.split(':');
        teamScore = scores[0];
        opponentScore = scores[1];
      }
      
      this.setData({
        showScoreInputModal: true,
        currentMatch: {
          row: row,
          col: col,
          team: team,
          opponent: opponent,
          isSwiss: false
        },
        teamScore: teamScore,
        opponentScore: opponentScore,
        activeScoreInput: 'team' // 默认激活队伍分数输入框
      });
    }
  },
  
  /**
   * 隐藏比分输入弹窗
   */
  hideScoreInputModal: function() {
    this.setData({
      showScoreInputModal: false,
      currentMatch: null,
      teamScore: '',
      opponentScore: ''
    });
  },
  
  /**
   * 处理队伍分数输入
   */
  onTeamScoreInput: function(e) {
    this.setData({
      teamScore: e.detail.value
    });
  },
  
  /**
   * 处理对手分数输入
   */
  onOpponentScoreInput: function(e) {
    this.setData({
      opponentScore: e.detail.value
    });
  },
  
  /**
   * 设置快捷分数
   */
  setQuickScore: function(e) {
    const { team, opponent } = e.currentTarget.dataset;
    
    this.setData({
      teamScore: team,
      opponentScore: opponent
    });
  },
  
  /**
   * 确认比分
   */
  confirmScore: function() {
    const { currentMatch, teamScore, opponentScore } = this.data;
    
    if (!teamScore && !opponentScore) {
      wx.showToast({
        title: '请输入比分',
        icon: 'none'
      });
      return;
    }
    
    if (currentMatch.isSwiss) {
      // 处理瑞士轮比赛的比分
      const score = teamScore + ':' + opponentScore;
      
      // 更新比分
      const matchTable = [...this.data.matchTable];
      matchTable[currentMatch.matchIndex].score = score;
      
      // 解析比分
      const leftScore = parseInt(teamScore);
      const rightScore = parseInt(opponentScore);
      
      if (!isNaN(leftScore) && !isNaN(rightScore)) {
        if (leftScore > rightScore) {
          matchTable[currentMatch.matchIndex].winner = 'player1';
        } else if (rightScore > leftScore) {
          matchTable[currentMatch.matchIndex].winner = 'player2';
        } else {
          matchTable[currentMatch.matchIndex].winner = 'tie';
        }
      }
      
      this.setData({
        matchTable: matchTable
      });
    } else {
      // 调用原有的inputScore方法处理分数
      this.inputScore({
        currentTarget: {
          dataset: {
            row: currentMatch.row,
            col: currentMatch.col,
            score: teamScore + ':' + opponentScore
          }
        }
      });
    }
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
    
    // 隐藏弹窗
    this.hideScoreInputModal();
  },

  /**
   * 清除双打组合
   */
  clearTeam: function(e) {
    const index = e.currentTarget.dataset.index;
    const { selectedPlayers } = this.data;
    let newSelectedPlayers = [...selectedPlayers];
    
    if (index === 0) {
      // 清除第一组
      newSelectedPlayers.splice(0, 2);
      // 如果还有第二组，将其移到第一组位置
      if (newSelectedPlayers.length >= 2) {
        const team2 = newSelectedPlayers.splice(0, 2);
        newSelectedPlayers = team2.concat(newSelectedPlayers);
      }
    } else if (index === 1) {
      // 清除第二组
      newSelectedPlayers.splice(2, 2);
    }
    
    this.setData({
      selectedPlayers: newSelectedPlayers
    });
  },

  /**
   * 移除双打组合
   */
  removeDoublesTeam: function(e) {
    const index = e.currentTarget.dataset.index;
    const { selectedPlayers } = this.data;
    let newSelectedPlayers = [...selectedPlayers];
    
    // 移除指定索引处的两名选手
    newSelectedPlayers.splice(index, 2);
    
    this.setData({
      selectedPlayers: newSelectedPlayers
    });
  },

  /**
   * 从已选择列表中移除选手
   */
  removeSelectedPlayer: function(e) {
    const playerId = e.currentTarget.dataset.playerId;
    const selectedPlayers = this.data.selectedPlayers.filter(p => p.id !== playerId);
    
    this.setData({
      selectedPlayers: selectedPlayers
    });
  },

  /**
   * 设置当前激活的分数输入框
   */
  setActiveScoreInput: function(e) {
    const input = e.currentTarget.dataset.input;
    this.setData({
      activeScoreInput: input
    });
  },
  
  /**
   * 输入数字
   */
  inputNumber: function(e) {
    const number = e.currentTarget.dataset.number;
    const { activeScoreInput, teamScore, opponentScore } = this.data;
    
    if (activeScoreInput === 'team') {
      // 输入队伍分数
      let newScore;
      // 如果当前分数是0或空，则直接替换为新数字
      if (teamScore === '' || teamScore === '0') {
        newScore = number;
      } else {
        newScore = teamScore + number;
      }
      // 限制最大为99
      if (parseInt(newScore) <= 99) {
        this.setData({
          teamScore: newScore
        });
      }
    } else if (activeScoreInput === 'opponent') {
      // 输入对手分数
      let newScore;
      // 如果当前分数是0或空，则直接替换为新数字
      if (opponentScore === '' || opponentScore === '0') {
        newScore = number;
      } else {
        newScore = opponentScore + number;
      }
      // 限制最大为99
      if (parseInt(newScore) <= 99) {
        this.setData({
          opponentScore: newScore
        });
      }
    }
  },
  
  /**
   * 输入快捷数字
   */
  inputQuickNumber: function(e) {
    const number = e.currentTarget.dataset.number;
    const { activeScoreInput } = this.data;
    
    if (activeScoreInput === 'team') {
      this.setData({
        teamScore: number
      });
    } else if (activeScoreInput === 'opponent') {
      this.setData({
        opponentScore: number
      });
    }
  },
  
  /**
   * 清除数字
   */
  clearNumber: function() {
    const { activeScoreInput } = this.data;
    
    if (activeScoreInput === 'team') {
      this.setData({
        teamScore: '0'  // 设置为'0'而不是空字符串
      });
    } else if (activeScoreInput === 'opponent') {
      this.setData({
        opponentScore: '0'  // 设置为'0'而不是空字符串
      });
    }
  },
  
  /**
   * 删除数字
   */
  deleteNumber: function() {
    const { activeScoreInput, teamScore, opponentScore } = this.data;
    
    if (activeScoreInput === 'team' && teamScore.length > 0) {
      this.setData({
        teamScore: teamScore.slice(0, -1)
      });
    } else if (activeScoreInput === 'opponent' && opponentScore.length > 0) {
      this.setData({
        opponentScore: opponentScore.slice(0, -1)
      });
    }
  },

  /**
   * 生成瑞士轮比赛
   * @param {Array} rankings 当前排名
   * @param {Number} round 轮次
   * @returns {Array} 比赛表格
   */
  generateSwissRoundMatches: function(rankings, round) {
    const { mode } = this.data;
    const matchTable = [];
    
    if (mode === 'singles') {
      // 单打模式
      if (round === 1) {
        // 第一轮按照初始排名配对：1 vs n/2+1, 2 vs n/2+2, ...
        const n = rankings.length;
        const halfN = Math.ceil(n / 2);
        
        // 确保所有选手都能参与比赛
        for (let i = 0; i < halfN; i++) {
          if (i + halfN < n) {
            // 正常配对
            const match = {
              round: 1,
              player1: rankings[i],
              player2: rankings[i + halfN],
              score: '',
              winner: null
            };
            
            matchTable.push(match);
          } else if (i < n) {
            // 如果选手数量为奇数，最后一名选手轮空或安排特殊比赛
            console.log("选手数量为奇数，最后一名选手轮空");
            // 可以在这里添加轮空逻辑
          }
        }
      } else {
        // 后续轮次按照当前排名配对
        // 这里简单实现，实际瑞士轮有更复杂的配对规则
        const availablePlayers = [...rankings];
        
        while (availablePlayers.length >= 2) {
          const player1 = availablePlayers.shift();
          
          // 找到未曾对阵过的对手
          let opponentIndex = -1;
          for (let i = 0; i < availablePlayers.length; i++) {
            if (!player1.opponents || !player1.opponents.includes(availablePlayers[i].id)) {
              opponentIndex = i;
              break;
            }
          }
          
          // 如果找不到未曾对阵过的对手，就选择第一个可用的对手
          if (opponentIndex === -1 && availablePlayers.length > 0) {
            opponentIndex = 0;
          }
          
          if (opponentIndex !== -1) {
            const player2 = availablePlayers.splice(opponentIndex, 1)[0];
            
            const match = {
              round: round,
              player1: player1,
              player2: player2,
              score: '',
              winner: null
            };
            
            matchTable.push(match);
          }
        }
      }
    } else {
      // 双打模式
      if (round === 1) {
        // 第一轮按照队伍数量配对
        const n = rankings.length;
        const halfN = Math.ceil(n / 2);
        
        // 确保所有队伍都能参与比赛
        for (let i = 0; i < halfN; i++) {
          if (i + halfN < n) {
            // 正常配对
            const match = {
              round: 1,
              team1: rankings[i],
              team2: rankings[i + halfN],
              score: '',
              winner: null
            };
            
            matchTable.push(match);
          } else if (i < n) {
            // 如果队伍数量为奇数，最后一支队伍轮空或安排特殊比赛
            console.log("队伍数量为奇数，最后一支队伍轮空");
            // 可以在这里添加轮空逻辑
          }
        }
      } else {
        // 后续轮次按照当前排名配对
        // 这里简单实现，实际瑞士轮有更复杂的配对规则
        const availableTeams = [...rankings];
        
        while (availableTeams.length >= 2) {
          const team1 = availableTeams.shift();
          
          // 找到未曾对阵过的对手
          let opponentIndex = -1;
          for (let i = 0; i < availableTeams.length; i++) {
            if (!team1.opponents || !team1.opponents.includes(availableTeams[i].id)) {
              opponentIndex = i;
              break;
            }
          }
          
          // 如果找不到未曾对阵过的对手，就选择第一个可用的对手
          if (opponentIndex === -1 && availableTeams.length > 0) {
            opponentIndex = 0;
          }
          
          if (opponentIndex !== -1) {
            const team2 = availableTeams.splice(opponentIndex, 1)[0];
            
            const match = {
              round: round,
              team1: team1,
              team2: team2,
              score: '',
              winner: null
            };
            
            matchTable.push(match);
          }
        }
      }
    }
    
    return matchTable;
  },

  /**
   * 滚动到指定选手的行
   */
  scrollToPlayer: function(e) {
    const index = e.currentTarget.dataset.index;
    if (index === undefined || !this.data.isMatchStarted) return;
    
    // 获取表格容器
    const query = wx.createSelectorQuery();
    query.select('#matchTableContainer').boundingClientRect();
    query.selectAll('.table-row').boundingClientRect();
    query.exec(res => {
      if (!res || !res[0] || !res[1] || res[1].length <= index) return;
      
      const containerRect = res[0];
      const rowRect = res[1][index + 1]; // +1 是因为第一行是表头
      
      if (rowRect) {
        // 计算需要滚动的位置
        const scrollLeft = rowRect.left - containerRect.left;
        
        // 滚动到选手所在行
        wx.createSelectorQuery()
          .select('#matchTableContainer')
          .node()
          .exec(res => {
            if (res && res[0] && res[0].node) {
              res[0].node.scrollLeft = scrollLeft;
            } else {
              // 如果无法获取节点，使用替代方案
              this.setData({
                scrollToIndex: index,
                showScrollHint: true
              });
              
              // 3秒后隐藏滚动提示
              setTimeout(() => {
                this.setData({
                  showScrollHint: false
                });
              }, 3000);
            }
          });
      }
    });
  },
}); 