// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    mode: 'singles', // 默认为单打模式
    players: [], // 所有可选择的选手
    selectedPlayers: [], // 已选择的选手
    groups: [], // 分组数据
    groupCount: 2, // 默认分组数量
    showPlayerSelectModal: false, // 是否显示选手选择弹窗
    showGroupSettingModal: false, // 是否显示分组设置弹窗
    currentStage: 'setup', // 当前阶段：setup, group, knockout
    knockoutMatches: [], // 淘汰赛对阵
    isMatchEnded: false, // 比赛是否已结束
    showAddTempPlayerModal: false, // 是否显示添加临时选手弹窗
    tempPlayerName: '', // 临时选手姓名
    tempPlayerGender: 'male', // 临时选手性别，默认为男
    currentGroupIndex: 0, // 当前选中的小组索引
    currentRound: 1, // 当前淘汰赛轮次
    knockoutRounds: [1, 2], // 淘汰赛轮次列表
    showRankingModal: false, // 是否显示排名结果弹窗
    allRankings: [], // 所有排名数据
    showScoreInputModal: false, // 是否显示比分输入弹窗
    currentMatch: null, // 当前激活的比分输入匹配
    teamScore: '', // 队伍分数
    opponentScore: '', // 对手分数
    activeScoreInput: 'team', // 当前激活的分数输入框
    groupProgressList: [], // 小组进度列表
    groupCompletedList: [], // 小组完成状态列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const mode = options.mode || 'singles';
    
    this.setData({
      mode: mode
    });
    
    // 加载选手数据
    this.loadPlayers();
    
    // 检查是否有进行中的比赛
    this.checkOngoingMatch();
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
    const ongoingMatch = wx.getStorageSync('ongoingGroupMatch');
    
    if (ongoingMatch && ongoingMatch.mode === this.data.mode) {
      this.setData({
        selectedPlayers: ongoingMatch.players,
        groups: ongoingMatch.groups,
        groupCount: ongoingMatch.groupCount,
        currentStage: ongoingMatch.currentStage,
        knockoutMatches: ongoingMatch.knockoutMatches || [],
        knockoutRounds: ongoingMatch.knockoutRounds || [1]
      }, () => {
        // 计算小组进度
        this.calculateGroupProgress();
      });
    }
  },
  
  /**
   * 计算小组进度和完成状态
   */
  calculateGroupProgress: function() {
    if (!this.data.groups || this.data.groups.length === 0) return;
    
    const groupProgressList = [];
    const groupCompletedList = [];
    
    this.data.groups.forEach(group => {
      // 计算完成比赛数量
      const completedMatches = group.matches.filter(match => match.winner).length;
      const totalMatches = group.matches.length;
      
      // 计算进度百分比
      const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches * 100) : 0;
      groupProgressList.push(progressPercentage);
      
      // 检查是否所有比赛都已完成
      const isCompleted = completedMatches === totalMatches;
      groupCompletedList.push(isCompleted);
    });
    
    this.setData({
      groupProgressList: groupProgressList,
      groupCompletedList: groupCompletedList
    });
  },
  
  /**
   * 获取当前小组的进度百分比
   */
  getCurrentGroupProgress: function() {
    if (this.data.groupProgressList && this.data.groupProgressList.length > 0) {
      return this.data.groupProgressList[this.data.currentGroupIndex];
    }
    return 0;
  },
  
  /**
   * 检查小组是否已完成所有比赛
   */
  isGroupCompleted: function(index) {
    if (this.data.groupCompletedList && this.data.groupCompletedList.length > 0) {
      return this.data.groupCompletedList[index];
    }
    return false;
  },
  
  /**
   * 获取当前小组已完成的比赛数量
   */
  getCurrentGroupCompletedMatches: function() {
    if (this.data.groups && this.data.groups.length > 0) {
      const currentGroup = this.data.groups[this.data.currentGroupIndex];
      if (currentGroup && currentGroup.matches) {
        return currentGroup.matches.filter(match => match.winner).length;
      }
    }
    return 0;
  },
  
  /**
   * 获取当前小组的总比赛数量
   */
  getCurrentGroupTotalMatches: function() {
    if (this.data.groups && this.data.groups.length > 0) {
      const currentGroup = this.data.groups[this.data.currentGroupIndex];
      if (currentGroup && currentGroup.matches) {
        return currentGroup.matches.length;
      }
    }
    return 0;
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
   * 显示分组设置弹窗
   */
  showGroupSetting: function() {
    this.setData({
      showGroupSettingModal: true
    });
  },
  
  /**
   * 隐藏分组设置弹窗
   */
  hideGroupSetting: function() {
    this.setData({
      showGroupSettingModal: false
    });
  },
  
  /**
   * 输入分组数量
   */
  inputGroupCount: function(e) {
    const count = parseInt(e.detail.value);
    
    if (!isNaN(count) && count >= 2) {
      this.setData({
        groupCount: count
      });
    }
  },
  
  /**
   * 选择/取消选择选手
   */
  togglePlayerSelection: function(e) {
    const playerId = e.currentTarget.dataset.id;
    const selectedPlayers = [...this.data.selectedPlayers];
    const playerIndex = selectedPlayers.findIndex(p => p.id === playerId);
    
    if (playerIndex !== -1) {
      // 已选择，取消选择
      selectedPlayers.splice(playerIndex, 1);
    } else {
      // 未选择，添加选择
      const player = this.data.players.find(p => p.id === playerId);
      if (player) {
        selectedPlayers.push(player);
      }
    }
    
    this.setData({
      selectedPlayers: selectedPlayers
    });
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
   * 关闭添加临时选手弹窗
   */
  closeAddTempPlayerModal: function() {
    this.setData({
      showAddTempPlayerModal: false
    });
  },
  
  /**
   * 输入临时选手名称
   */
  inputTempPlayerName: function(e) {
    this.setData({
      tempPlayerName: e.detail.value
    });
  },
  
  /**
   * 选择临时选手性别
   */
  selectTempPlayerGender: function(e) {
    this.setData({
      tempPlayerGender: e.detail.value
    });
  },
  
  /**
   * 确认添加临时选手
   */
  confirmAddTempPlayer: function() {
    const { tempPlayerName, tempPlayerGender, selectedPlayers } = this.data;
    
    if (!tempPlayerName.trim()) {
      wx.showToast({
        title: '请输入选手姓名',
        icon: 'none'
      });
      return;
    }
    
    // 检查名称是否与已注册选手重复（从全局获取所有注册选手）
    const allRegisteredPlayers = getApp().globalData.players || [];
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
    const nameExists = selectedPlayers.some(player => player.name === tempPlayerName);
    if (nameExists) {
      wx.showToast({
        title: '该名字在当前选手列表中已存在',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 生成唯一ID
    const tempPlayerId = 'temp_' + Date.now();
    
    // 创建临时选手对象
    const tempPlayer = {
      id: tempPlayerId,
      name: tempPlayerName,
      gender: tempPlayerGender,
      isTemporary: true
    };
    
    // 添加到已选择列表
    const newSelectedPlayers = [...selectedPlayers, tempPlayer];
    
    this.setData({
      selectedPlayers: newSelectedPlayers,
      showAddTempPlayerModal: false
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
   * 确认选手选择
   */
  confirmPlayerSelection: function() {
    const { selectedPlayers, mode } = this.data;
    
    // 检查选手数量
    if (selectedPlayers.length < 4) {
      wx.showToast({
        title: '至少需要4名选手',
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
    
    this.setData({
      showPlayerSelectModal: false
    });
    
    // 显示分组设置弹窗
    this.showGroupSetting();
  },
  
  /**
   * 更改分组数量
   */
  changeGroupCount: function(e) {
    const count = parseInt(e.detail.value);
    
    if (!isNaN(count) && count >= 2 && count <= Math.floor(this.data.selectedPlayers.length / 2)) {
      this.setData({
        groupCount: count
      });
    } else {
      wx.showToast({
        title: '分组数量无效',
        icon: 'none'
      });
    }
  },
  
  /**
   * 确认分组设置
   */
  confirmGroupSetting: function() {
    const { selectedPlayers, groupCount, mode } = this.data;
    
    // 检查分组数量
    if (groupCount < 2 || groupCount > Math.floor(selectedPlayers.length / 2)) {
      wx.showToast({
        title: '分组数量无效',
        icon: 'none'
      });
      return;
    }
    
    // 生成分组
    this.generateGroups();
    
    this.setData({
      showGroupSettingModal: false,
      currentStage: 'group'
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 生成分组
   */
  generateGroups: function() {
    const { selectedPlayers, groupCount, mode } = this.data;
    let shuffledPlayers = [...selectedPlayers];
    
    // 随机打乱选手顺序
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }
    
    const groups = [];
    
    if (mode === 'singles') {
      // 单打模式
      const playersPerGroup = Math.ceil(shuffledPlayers.length / groupCount);
      
      for (let i = 0; i < groupCount; i++) {
        const groupPlayers = shuffledPlayers.slice(i * playersPerGroup, (i + 1) * playersPerGroup);
        const groupMatches = [];
        
        // 生成小组内的比赛
        for (let j = 0; j < groupPlayers.length; j++) {
          for (let k = j + 1; k < groupPlayers.length; k++) {
            groupMatches.push({
              player1: groupPlayers[j],
              player2: groupPlayers[k],
              score: '',
              winner: null
            });
          }
        }
        
        groups.push({
          id: `group_${i + 1}`,
          name: `小组 ${i + 1}`,
          players: groupPlayers,
          matches: groupMatches,
          rankings: []
        });
      }
    } else {
      // 双打模式
      // 将选手两两组队
      const teams = [];
      
      // 先将选手按性别分组
      const malePlayers = shuffledPlayers.filter(p => p.gender === 'male');
      const femalePlayers = shuffledPlayers.filter(p => p.gender === 'female');
      
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
      
      // 随机打乱队伍顺序
      for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
      }
      
      const teamsPerGroup = Math.ceil(teams.length / groupCount);
      
      for (let i = 0; i < groupCount; i++) {
        const groupTeams = teams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
        const groupMatches = [];
        
        // 生成小组内的比赛
        for (let j = 0; j < groupTeams.length; j++) {
          for (let k = j + 1; k < groupTeams.length; k++) {
            groupMatches.push({
              team1: groupTeams[j],
              team2: groupTeams[k],
              score: '',
              winner: null
            });
          }
        }
        
        groups.push({
          id: `group_${i + 1}`,
          name: `小组 ${i + 1}`,
          teams: groupTeams,
          matches: groupMatches,
          rankings: []
        });
      }
    }
    
    this.setData({
      groups: groups
    });
  },
  
  /**
   * 保存进行中的比赛
   */
  saveOngoingMatch: function() {
    const { selectedPlayers, groups, groupCount, mode, currentStage, knockoutMatches, knockoutRounds } = this.data;
    
    wx.setStorageSync('ongoingGroupMatch', {
      mode: mode,
      players: selectedPlayers,
      groups: groups,
      groupCount: groupCount,
      currentStage: currentStage,
      knockoutMatches: knockoutMatches,
      knockoutRounds: knockoutRounds,
      updateTime: new Date().toISOString()
    });
  },
  
  /**
   * 输入比分
   */
  inputScore: function(e) {
    const { groupIndex, matchIndex } = e.currentTarget.dataset;
    const score = e.detail.value;
    
    // 更新比分
    const groups = [...this.data.groups];
    groups[groupIndex].matches[matchIndex].score = score;
    
    // 解析比分 - 始终以player1/team1视角判断胜负
    const scores = score.split(':');
    if (scores.length === 2) {
      const leftScore = parseInt(scores[0]);
      const rightScore = parseInt(scores[1]);
      
      if (!isNaN(leftScore) && !isNaN(rightScore)) {
        if (leftScore > rightScore) {
          groups[groupIndex].matches[matchIndex].winner = 'player1';
        } else if (rightScore > leftScore) {
          groups[groupIndex].matches[matchIndex].winner = 'player2';
        } else {
          groups[groupIndex].matches[matchIndex].winner = 'tie';
        }
        
        // 添加注释，标明比分是从player1/team1的视角记录的
        groups[groupIndex].matches[matchIndex].scoreViewpoint = 'player1';
      }
    }
    
    // 更新小组排名
    this.updateGroupRankings(groupIndex);
    
    this.setData({
      groups: groups
    }, () => {
      // 重新计算小组进度
      this.calculateGroupProgress();
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 更新小组排名
   */
  updateGroupRankings: function(groupIndex) {
    const group = this.data.groups[groupIndex];
    const { mode } = this.data;
    
    if (mode === 'singles') {
      // 单打模式
      const playerStats = {};
      
      // 初始化选手统计
      group.players.forEach(player => {
        playerStats[player.id] = {
          player: player,
          wins: 0,
          losses: 0,
          ties: 0,
          points: 0,
          pointDiff: 0
        };
      });
      
      // 统计比赛结果
      group.matches.forEach(match => {
        if (match.winner) {
          const scores = match.score.split(':');
          if (scores.length === 2) {
            const leftScore = parseInt(scores[0]);
            const rightScore = parseInt(scores[1]);
            
            if (!isNaN(leftScore) && !isNaN(rightScore)) {
              const player1Stats = playerStats[match.player1.id];
              const player2Stats = playerStats[match.player2.id];
              
              if (match.winner === 'player1') {
                player1Stats.wins++;
                player1Stats.points += 1;
                player2Stats.losses++;
                
                player1Stats.pointDiff += (leftScore - rightScore);
                player2Stats.pointDiff += (rightScore - leftScore);
              } else if (match.winner === 'player2') {
                player2Stats.wins++;
                player2Stats.points += 1;
                player1Stats.losses++;
                
                player1Stats.pointDiff += (leftScore - rightScore);
                player2Stats.pointDiff += (rightScore - leftScore);
              } else if (match.winner === 'tie') {
                player1Stats.ties++;
                player2Stats.ties++;
                player1Stats.points += 1;
                player2Stats.points += 1;
              }
            }
          }
        }
      });
      
      // 排序
      const rankings = Object.values(playerStats).sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.pointDiff !== b.pointDiff) return b.pointDiff - a.pointDiff;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return 0;
      });
      
      // 更新排名
      const groups = [...this.data.groups];
      groups[groupIndex].rankings = rankings;
      
      this.setData({
        groups: groups
      });
    } else {
      // 双打模式
      const teamStats = {};
      
      // 初始化队伍统计
      group.teams.forEach(team => {
        teamStats[team.id] = {
          team: team,
          wins: 0,
          losses: 0,
          ties: 0,
          points: 0,
          pointDiff: 0
        };
      });
      
      // 统计比赛结果
      group.matches.forEach(match => {
        if (match.winner) {
          const scores = match.score.split(':');
          if (scores.length === 2) {
            const leftScore = parseInt(scores[0]);
            const rightScore = parseInt(scores[1]);
            
            if (!isNaN(leftScore) && !isNaN(rightScore)) {
              const team1Stats = teamStats[match.team1.id];
              const team2Stats = teamStats[match.team2.id];
              
              if (match.winner === 'player1') {
                team1Stats.wins++;
                team1Stats.points += 1;
                team2Stats.losses++;
                
                team1Stats.pointDiff += (leftScore - rightScore);
                team2Stats.pointDiff += (rightScore - leftScore);
              } else if (match.winner === 'player2') {
                team2Stats.wins++;
                team2Stats.points += 1;
                team1Stats.losses++;
                
                team1Stats.pointDiff += (leftScore - rightScore);
                team2Stats.pointDiff += (rightScore - leftScore);
              } else if (match.winner === 'tie') {
                team1Stats.ties++;
                team2Stats.ties++;
                team1Stats.points += 1;
                team2Stats.points += 1;
              }
            }
          }
        }
      });
      
      // 排序
      const rankings = Object.values(teamStats).sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.pointDiff !== b.pointDiff) return b.pointDiff - a.pointDiff;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return 0;
      });
      
      // 更新排名
      const groups = [...this.data.groups];
      groups[groupIndex].rankings = rankings;
      
      this.setData({
        groups: groups
      });
    }
  },
  
  /**
   * 开始淘汰赛阶段
   */
  startKnockoutStage: function() {
    this.finishGroupStage();
  },
  
  /**
   * 完成小组赛
   */
  finishGroupStage: function() {
    const { groups } = this.data;
    
    // 检查是否所有比赛都已完成
    let allMatchesCompleted = true;
    
    for (const group of groups) {
      for (const match of group.matches) {
        if (!match.winner) {
          allMatchesCompleted = false;
          break;
        }
      }
      
      if (!allMatchesCompleted) break;
    }
    
    if (!allMatchesCompleted) {
      wx.showModal({
        title: '未完成比赛',
        content: '还有未完成的小组赛比赛，确定要继续吗？',
        success: (res) => {
          if (res.confirm) {
            this.generateKnockoutMatches();
          }
        }
      });
    } else {
      this.generateKnockoutMatches();
    }
  },
  
  /**
   * 生成淘汰赛对阵
   */
  generateKnockoutMatches: function() {
    const { groups, mode } = this.data;
    const knockoutMatches = [];
    
    // 获取每个小组的前两名
    const qualifiers = [];
    
    for (const group of groups) {
      if (group.rankings.length >= 2) {
        qualifiers.push(group.rankings[0]); // 小组第一
        qualifiers.push(group.rankings[1]); // 小组第二
      }
    }
    
    // 生成淘汰赛对阵
    // 规则：A组第一 vs B组第二，B组第一 vs A组第二，以此类推
    for (let i = 0; i < Math.floor(qualifiers.length / 2); i++) {
      const groupIndex = Math.floor(i / 2);
      const isFirstPlace = i % 2 === 0;
      
      const opponent1 = qualifiers[i];
      const opponent2 = qualifiers[qualifiers.length - 1 - i];
      
      if (mode === 'singles') {
        knockoutMatches.push({
          id: `knockout_${i}`,
          round: 1,
          player1: opponent1.player,
          player2: opponent2.player,
          score: '',
          winner: null
        });
      } else {
        knockoutMatches.push({
          id: `knockout_${i}`,
          round: 1,
          team1: opponent1.team,
          team2: opponent2.team,
          score: '',
          winner: null
        });
      }
    }
    
    // 计算轮次列表
    const totalTeams = Math.floor(qualifiers.length / 2);
    const maxRounds = Math.ceil(Math.log2(totalTeams));
    const knockoutRounds = [];
    for (let i = 1; i <= maxRounds; i++) {
      knockoutRounds.push(i);
    }
    
    this.setData({
      knockoutMatches: knockoutMatches,
      currentStage: 'knockout',
      knockoutRounds: knockoutRounds,
      currentRound: 1
    });
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 输入淘汰赛比分
   */
  inputKnockoutScore: function(e) {
    const { matchIndex } = e.currentTarget.dataset;
    const score = e.detail.value;
    
    // 更新比分
    const knockoutMatches = [...this.data.knockoutMatches];
    knockoutMatches[matchIndex].score = score;
    
    // 解析比分 - 始终以player1/team1视角判断胜负
    const scores = score.split(':');
    if (scores.length === 2) {
      const leftScore = parseInt(scores[0]);
      const rightScore = parseInt(scores[1]);
      
      if (!isNaN(leftScore) && !isNaN(rightScore)) {
        if (leftScore > rightScore) {
          knockoutMatches[matchIndex].winner = 'player1';
        } else if (rightScore > leftScore) {
          knockoutMatches[matchIndex].winner = 'player2';
        }
        
        // 添加注释，标明比分是从player1/team1的视角记录的
        knockoutMatches[matchIndex].scoreViewpoint = 'player1';
      }
    }
    
    this.setData({
      knockoutMatches: knockoutMatches
    });
    
    // 检查是否需要生成下一轮比赛
    this.checkNextRound();
    
    // 保存进行中的比赛
    this.saveOngoingMatch();
  },
  
  /**
   * 检查是否需要生成下一轮比赛
   */
  checkNextRound: function() {
    const { knockoutMatches, mode } = this.data;
    const currentRound = Math.max(...knockoutMatches.map(m => m.round));
    const currentRoundMatches = knockoutMatches.filter(m => m.round === currentRound);
    
    // 检查当前轮次是否所有比赛都已完成
    const allMatchesCompleted = currentRoundMatches.every(m => m.winner);
    
    if (allMatchesCompleted && currentRoundMatches.length >= 2) {
      // 生成下一轮比赛
      const winners = currentRoundMatches.map(m => {
        if (m.winner === 'player1') {
          return mode === 'singles' ? m.player1 : m.team1;
        } else {
          return mode === 'singles' ? m.player2 : m.team2;
        }
      });
      
      const nextRoundMatches = [];
      
      for (let i = 0; i < Math.floor(winners.length / 2); i++) {
        if (mode === 'singles') {
          nextRoundMatches.push({
            id: `knockout_${knockoutMatches.length + i}`,
            round: currentRound + 1,
            player1: winners[i * 2],
            player2: winners[i * 2 + 1],
            score: '',
            winner: null
          });
        } else {
          nextRoundMatches.push({
            id: `knockout_${knockoutMatches.length + i}`,
            round: currentRound + 1,
            team1: winners[i * 2],
            team2: winners[i * 2 + 1],
            score: '',
            winner: null
          });
        }
      }
      
      // 更新轮次列表
      const knockoutRounds = [...this.data.knockoutRounds];
      if (!knockoutRounds.includes(currentRound + 1)) {
        knockoutRounds.push(currentRound + 1);
      }
      
      // 添加到淘汰赛对阵
      this.setData({
        knockoutMatches: [...knockoutMatches, ...nextRoundMatches],
        knockoutRounds: knockoutRounds
      });
      
      // 保存进行中的比赛
      this.saveOngoingMatch();
    }
  },
  
  /**
   * 结束比赛
   */
  endMatch: function() {
    wx.showModal({
      title: '确认结束比赛',
      content: '确定要结束本次比赛吗？比赛结果将被保存。',
      success: (res) => {
        if (res.confirm) {
          // 处理比赛结果
          this.processMatchResults();
          
          // 清除进行中的比赛
          wx.removeStorageSync('ongoingGroupMatch');
          
          this.setData({
            isMatchEnded: true
          });
          
          // 显示排名结果弹窗
          this.showRankingModal();
        }
      }
    });
  },
  
  /**
   * 显示排名结果弹窗
   */
  showRankingModal: function() {
    // 获取所有小组的排名数据
    const allRankings = [];
    
    // 如果是淘汰赛阶段，找出冠军
    if (this.data.currentStage === 'knockout') {
      const finalMatch = this.data.knockoutMatches.find(match => match.round === Math.max(...this.data.knockoutRounds));
      if (finalMatch && finalMatch.winner) {
        const champion = finalMatch.winner === 'player1' ? 
          (this.data.mode === 'singles' ? finalMatch.player1 : finalMatch.team1) : 
          (this.data.mode === 'singles' ? finalMatch.player2 : finalMatch.team2);
        
        if (champion) {
          allRankings.push({
            player: this.data.mode === 'singles' ? champion : undefined,
            team: this.data.mode === 'singles' ? undefined : champion,
            rank: 1,
            isChampion: true
          });
        }
      }
    }
    
    // 添加所有小组的排名
    this.data.groups.forEach((group, groupIndex) => {
      if (group.rankings && group.rankings.length > 0) {
        group.rankings.forEach((ranking, rankIndex) => {
          allRankings.push({
            ...ranking,
            groupName: group.name,
            groupRank: rankIndex + 1
          });
        });
      }
    });
    
    this.setData({
      showRankingModal: true,
      allRankings: allRankings
    });
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
    this.hideRankingModal();
    
    // 返回主页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },
  
  /**
   * 处理比赛结果
   */
  processMatchResults: function() {
    const { groups, knockoutMatches, mode } = this.data;
    const matchHistory = [];
    
    // 添加检查临时选手的辅助函数
    const hasTemporaryPlayer = (players) => {
      return players.some(player => player.isTemporary === true);
    };
    
    // 处理小组赛结果
    for (const group of groups) {
      for (const match of group.matches) {
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
        
        if (mode === 'singles') {
          leftTeamPlayers = [match.player1];
          rightTeamPlayers = [match.player2];
          
          matchRecord = {
            id: Date.now().toString() + '_' + match.player1.id + '_' + match.player2.id,
            date: new Date().toISOString(),
            leftTeam: leftTeamPlayers,
            rightTeam: rightTeamPlayers,
            leftScore: leftScore,
            rightScore: rightScore,
            winner: match.winner === 'player1' ? 'left' : 'right'
          };
        } else {
          leftTeamPlayers = match.team1.players;
          rightTeamPlayers = match.team2.players;
          
          matchRecord = {
            id: Date.now().toString() + '_' + match.team1.id + '_' + match.team2.id,
            date: new Date().toISOString(),
            leftTeam: leftTeamPlayers,
            rightTeam: rightTeamPlayers,
            leftScore: leftScore,
            rightScore: rightScore,
            winner: match.winner === 'player1' ? 'left' : 'right'
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
    
    // 处理淘汰赛结果
    for (const match of knockoutMatches) {
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
      
      if (mode === 'singles') {
        leftTeamPlayers = [match.player1];
        rightTeamPlayers = [match.player2];
        
        matchRecord = {
          id: Date.now().toString() + '_' + match.player1.id + '_' + match.player2.id,
          date: new Date().toISOString(),
          leftTeam: leftTeamPlayers,
          rightTeam: rightTeamPlayers,
          leftScore: leftScore,
          rightScore: rightScore,
          winner: match.winner === 'player1' ? 'left' : 'right'
        };
      } else {
        leftTeamPlayers = match.team1.players;
        rightTeamPlayers = match.team2.players;
        
        matchRecord = {
          id: Date.now().toString() + '_' + match.team1.id + '_' + match.team2.id,
          date: new Date().toISOString(),
          leftTeam: leftTeamPlayers,
          rightTeam: rightTeamPlayers,
          leftScore: leftScore,
          rightScore: rightScore,
          winner: match.winner === 'player1' ? 'left' : 'right'
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
    
    // 更新全局比赛记录
    const allMatchHistory = [...app.globalData.matchHistory, ...matchHistory];
    app.globalData.matchHistory = allMatchHistory;
    
    // 保存到本地存储
    wx.setStorageSync('matchHistory', allMatchHistory);
  },

  /**
   * 切换小组
   */
  switchGroup: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentGroupIndex: index
    });
  },

  /**
   * 滑动切换小组
   */
  swiperChange: function(e) {
    const index = e.detail.current;
    this.setData({
      currentGroupIndex: index
    });
  },

  /**
   * 切换淘汰赛轮次
   */
  switchRound: function(e) {
    const round = e.currentTarget.dataset.round;
    this.setData({
      currentRound: round
    });
  },

  /**
   * 显示比分输入弹窗
   */
  showScoreInputModal: function(e) {
    const groupIndex = e.currentTarget.dataset.groupIndex;
    const matchIndex = e.currentTarget.dataset.matchIndex;
    const knockoutMatchIndex = e.currentTarget.dataset.knockoutMatchIndex;
    
    if (this.data.currentStage === 'knockout' && knockoutMatchIndex !== undefined) {
      // 淘汰赛比分输入
      const match = this.data.knockoutMatches[knockoutMatchIndex];
      const team = this.data.mode === 'singles' ? match.player1 : match.team1;
      const opponent = this.data.mode === 'singles' ? match.player2 : match.team2;
      
      // 解析已有的比分 - 始终以player1/team1视角显示
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
          knockoutMatchIndex: knockoutMatchIndex,
          team: team,
          opponent: opponent,
          isKnockout: true
        },
        teamScore: teamScore,
        opponentScore: opponentScore,
        activeScoreInput: 'team' // 默认激活队伍分数输入框
      });
    } else {
      // 小组赛比分输入
      const match = this.data.groups[groupIndex].matches[matchIndex];
      const team = this.data.mode === 'singles' ? match.player1 : match.team1;
      const opponent = this.data.mode === 'singles' ? match.player2 : match.team2;
      
      // 解析已有的比分 - 始终以player1/team1视角显示
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
          groupIndex: groupIndex,
          matchIndex: matchIndex,
          team: team,
          opponent: opponent,
          isKnockout: false
        },
        teamScore: teamScore,
        opponentScore: opponentScore,
        activeScoreInput: 'team' // 默认激活队伍分数输入框
      });
    }
  },

  /**
   * 显示淘汰赛比分输入弹窗
   */
  showKnockoutScoreInputModal: function(e) {
    const matchIndex = e.currentTarget.dataset.matchIndex;
    
    // 获取淘汰赛比赛数据
    const match = this.data.knockoutMatches[matchIndex];
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
        knockoutMatchIndex: matchIndex,
        team: team,
        opponent: opponent,
        isKnockout: true
      },
      teamScore: teamScore,
      opponentScore: opponentScore,
      activeScoreInput: 'team' // 默认激活队伍分数输入框
    });
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
   * 设置当前激活的分数输入框
   */
  setActiveScoreInput: function(e) {
    const input = e.currentTarget.dataset.input;
    this.setData({
      activeScoreInput: input
    });
  },
  
  /**
   * 激活队伍分数输入框
   */
  activateTeamScore: function() {
    this.setData({
      activeScoreInput: 'team'
    });
  },
  
  /**
   * 激活对手分数输入框
   */
  activateOpponentScore: function() {
    this.setData({
      activeScoreInput: 'opponent'
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
    
    // 始终以player1/team1视角记录比分
    const score = teamScore + ':' + opponentScore;
    
    if (currentMatch.isKnockout && currentMatch.knockoutMatchIndex !== undefined) {
      // 处理淘汰赛比分
      const match = this.data.knockoutMatches[currentMatch.knockoutMatchIndex];
      if (match) {
        // 直接更新数据
        const knockoutMatches = [...this.data.knockoutMatches];
        knockoutMatches[currentMatch.knockoutMatchIndex].score = score;
        
        // 解析比分 - 始终以player1/team1视角判断胜负
        const scores = score.split(':');
        if (scores.length === 2) {
          const leftScore = parseInt(scores[0]);
          const rightScore = parseInt(scores[1]);
          
          if (!isNaN(leftScore) && !isNaN(rightScore)) {
            if (leftScore > rightScore) {
              knockoutMatches[currentMatch.knockoutMatchIndex].winner = 'player1';
            } else if (rightScore > leftScore) {
              knockoutMatches[currentMatch.knockoutMatchIndex].winner = 'player2';
            }
            
            // 添加注释，标明比分是从player1/team1的视角记录的
            knockoutMatches[currentMatch.knockoutMatchIndex].scoreViewpoint = 'player1';
          }
        }
    
    this.setData({
          knockoutMatches: knockoutMatches
        });
        
        // 检查是否需要生成下一轮比赛
        this.checkNextRound();
        
        // 保存进行中的比赛
        this.saveOngoingMatch();
      }
    } else if (!currentMatch.isKnockout && currentMatch.groupIndex !== undefined && currentMatch.matchIndex !== undefined) {
      // 处理小组赛比分
      const groups = [...this.data.groups];
      const match = groups[currentMatch.groupIndex].matches[currentMatch.matchIndex];
      
      if (match) {
        // 直接更新比分
        groups[currentMatch.groupIndex].matches[currentMatch.matchIndex].score = score;
        
        // 解析比分 - 始终以player1/team1视角判断胜负
        const scores = score.split(':');
        if (scores.length === 2) {
          const leftScore = parseInt(scores[0]);
          const rightScore = parseInt(scores[1]);
          
          if (!isNaN(leftScore) && !isNaN(rightScore)) {
            if (leftScore > rightScore) {
              groups[currentMatch.groupIndex].matches[currentMatch.matchIndex].winner = 'player1';
            } else if (rightScore > leftScore) {
              groups[currentMatch.groupIndex].matches[currentMatch.matchIndex].winner = 'player2';
            } else {
              groups[currentMatch.groupIndex].matches[currentMatch.matchIndex].winner = 'tie';
            }
            
            // 添加注释，标明比分是从player1/team1的视角记录的
            groups[currentMatch.groupIndex].matches[currentMatch.matchIndex].scoreViewpoint = 'player1';
          }
        }
        
        // 更新小组排名
        this.updateGroupRankings(currentMatch.groupIndex);
        
        this.setData({
          groups: groups
        }, () => {
          // 重新计算小组进度
          this.calculateGroupProgress();
        });
        
        // 保存进行中的比赛
        this.saveOngoingMatch();
      }
    } else {
    wx.showToast({
        title: '比赛信息不完整',
        icon: 'none'
      });
    }
    
    // 隐藏弹窗
    this.hideScoreInputModal();
  },

  /**
   * 获取当前轮次的最大轮次
   */
  getMaxRound: function() {
    if (this.data.knockoutRounds && this.data.knockoutRounds.length > 0) {
      return Math.max.apply(null, this.data.knockoutRounds);
    }
    return 1;
  },
  
  /**
   * 获取当前轮次已完成的比赛数量
   */
  getCurrentRoundCompletedMatches: function() {
    if (this.data.knockoutMatches && this.data.knockoutMatches.length > 0) {
      return this.data.knockoutMatches.filter(function(m) {
        return m.round === this.data.currentRound && m.winner;
      }, this).length;
    }
    return 0;
  },
  
  /**
   * 获取当前轮次的总比赛数量
   */
  getCurrentRoundTotalMatches: function() {
    if (this.data.knockoutMatches && this.data.knockoutMatches.length > 0) {
      return this.data.knockoutMatches.filter(function(m) {
        return m.round === this.data.currentRound;
      }, this).length;
    }
    return 0;
  },
  
  /**
   * 检查指定轮次是否已完成所有比赛
   */
  isRoundCompleted: function(round) {
    if (this.data.knockoutMatches && this.data.knockoutMatches.length > 0) {
      const roundMatches = this.data.knockoutMatches.filter(function(m) {
        return m.round === round;
      });
      
      if (roundMatches.length === 0) return false;
      
      return roundMatches.every(function(m) {
        return m.winner;
      });
    }
    return false;
  },
  
  /**
   * 检查当前轮次是否没有比赛
   */
  isCurrentRoundEmpty: function() {
    return this.getCurrentRoundTotalMatches() === 0;
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation: function(e) {
    // 阻止事件冒泡，防止点击弹窗内容时触发hideScoreInputModal
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  },

  /**
   * 阻止页面滚动
   */
  preventTouchMove: function(e) {
    // 阻止页面滚动
  }
}); 