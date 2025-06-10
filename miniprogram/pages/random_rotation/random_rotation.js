// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 比赛模式
    mode: 'doubles', // 默认为双打模式
    
    // 选手数据
    allPlayers: [], // 所有注册选手
    selectedPlayers: [], // 已选择的选手
    
    // 比赛状态
    tournamentStarted: false, // 比赛是否已开始
    matches: [], // 比赛列表
    ongoingMatches: [], // 已完成的比赛列表
    
    // 弹窗控制
    showPlayerModal: false, // 是否显示选手选择弹窗
    showScoreModal: false, // 是否显示分数输入弹窗
    showResultModal: false, // 是否显示排名结果弹窗
    showAddTempPlayerModal: false, // 是否显示添加临时选手弹窗
    
    // 临时数据
    tempLeftScore: '', // 临时左队分数
    tempRightScore: '', // 临时右队分数
    currentMatchIndex: -1, // 当前比赛索引
    currentInputSide: 'left', // 当前输入方向，可选值：'left'或'right'
    tempPlayerName: '', // 临时选手姓名
    tempPlayerGender: 'male', // 临时选手性别，默认为男
    
    // 结果数据
    playerResults: [] // 选手排名结果
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 设置模式
    if (options.mode === 'mixed') {
      this.setData({
        mode: 'mixed' // 混双轮转模式
      });
      wx.setNavigationBarTitle({
        title: '混双轮转'
      });
    } else {
      // 随机轮转只支持双打模式
      this.setData({
        mode: 'doubles' // 强制设置为双打模式
      });
      wx.setNavigationBarTitle({
        title: '随机轮转'
      });
    }
    
    // 获取所有选手
    this.loadPlayers();
    
    // 检查是否有进行中的比赛
    this.checkOngoingMatch();
  },

  /**
   * 加载选手数据
   */
  loadPlayers: function() {
    // 从存储中获取最新的选手数据
    const players = wx.getStorageSync('players') || [];
    // 更新全局数据，确保一致性
    app.globalData.players = players;
    
    this.setData({
      allPlayers: players
    });
  },

  /**
   * 检查是否有进行中的比赛
   */
  checkOngoingMatch: function() {
    const mode = this.data.mode;
    let ongoingMatch;
    
    if (mode === 'mixed') {
      // 检查混双轮转模式的进行中比赛
      ongoingMatch = wx.getStorageSync('ongoingMixedRandomMatch');
    } else {
      // 检查随机轮转模式的进行中比赛
      ongoingMatch = wx.getStorageSync('ongoingRandomRotationMatch');
    }
    
    if (ongoingMatch) {
      this.setData({
        mode: ongoingMatch.mode,
        selectedPlayers: ongoingMatch.selectedPlayers,
        tournamentStarted: true,
        matches: ongoingMatch.matches
      });
    }
  },

  /**
   * 显示选手选择弹窗
   */
  showPlayerSelectionModal: function() {
    this.setData({
      showPlayerModal: true
    });
  },

  /**
   * 隐藏选手选择弹窗
   */
  hidePlayerModal: function() {
    this.setData({
      showPlayerModal: false
    });
  },

  /**
   * 切换选手选择状态
   */
  togglePlayerSelection: function(e) {
    const player = e.currentTarget.dataset.player;
    let selectedPlayers = [...this.data.selectedPlayers];
    
    // 检查是否已选择
    const index = selectedPlayers.findIndex(p => p.id === player.id);
    
    // 如果是双打模式
    if (this.data.mode === 'doubles') {
      // 如果已经选择了4名选手，且当前选手未被选中，则不允许再选
      if (selectedPlayers.length >= 4 && index === -1) {
        wx.showToast({
          title: '双打模式最多选择4名选手',
          icon: 'none'
        });
        return;
      }
    }
    
    if (index !== -1) {
      // 已选择，取消选择
      selectedPlayers.splice(index, 1);
    } else {
      // 未选择，添加选择
      selectedPlayers.push(player);
    }
    
    this.setData({
      selectedPlayers: selectedPlayers
    });
  },

  /**
   * 检查选手是否被选中
   */
  isPlayerSelected: function(player) {
    return this.data.selectedPlayers.some(p => p.id === player.id);
  },

  /**
   * 确认选手选择
   */
  confirmPlayerSelection: function() {
    // 验证选手数量
    const { selectedPlayers, mode } = this.data;
    
    if (mode === 'mixed') {
      // 混双轮转模式需要验证男女选手数量
      const malePlayers = selectedPlayers.filter(p => p.gender === 'male');
      const femalePlayers = selectedPlayers.filter(p => p.gender === 'female');
      
      // 检查是否有足够的男选手和女选手
      if (malePlayers.length < 2 || femalePlayers.length < 2) {
        wx.showToast({
          title: '混双模式至少需要2名男选手和2名女选手',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 检查选手总数是否为偶数
      if (selectedPlayers.length % 2 !== 0) {
        wx.showToast({
          title: '需要偶数名选手',
          icon: 'none'
        });
        return;
      }
      
      // 生成混双轮转比赛对阵
      const matches = this.generateMixedRandomMatches(selectedPlayers);
      
      // 检查是否成功生成比赛
      if (matches.length === 0) {
        wx.showToast({
          title: '生成比赛失败，请重试',
          icon: 'none'
        });
        return;
      }
      
      // 显示比赛数量提示
      wx.showToast({
        title: `已生成 ${matches.length} 场比赛`,
        icon: 'success'
      });
      
      // 保存当前比赛状态
      const tournamentData = {
        mode: 'mixed',
        selectedPlayers: selectedPlayers,
        matches: matches
      };
      
      wx.setStorageSync('ongoingMixedRandomMatch', tournamentData);
      
      // 更新页面状态
      this.setData({
        tournamentStarted: true,
        matches: matches,
        showPlayerModal: false
      });
    } else {
      // 随机轮转需要至少4名选手且为偶数
      if (selectedPlayers.length < 4) {
        wx.showToast({
          title: '至少需要4名选手',
          icon: 'none'
        });
        return;
      }
      
      // 检查选手数量是否为偶数
      if (selectedPlayers.length % 2 !== 0) {
        wx.showToast({
          title: '需要偶数名选手',
          icon: 'none'
        });
        return;
      }
      
      // 生成随机轮转比赛对阵
      const matches = this.generateRandomMatches(selectedPlayers);
      
      // 检查是否成功生成比赛
      if (matches.length === 0) {
        wx.showToast({
          title: '生成比赛失败，请重试',
          icon: 'none'
        });
        return;
      }
      
      // 显示比赛数量提示
      wx.showToast({
        title: `已生成 ${matches.length} 场比赛`,
        icon: 'success'
      });
      
      // 保存当前比赛状态
      const tournamentData = {
        mode: 'doubles', // 随机轮转只支持双打模式
        selectedPlayers: selectedPlayers,
        matches: matches
      };
      
      wx.setStorageSync('ongoingRandomRotationMatch', tournamentData);
      
      // 更新页面状态
      this.setData({
        tournamentStarted: true,
        matches: matches,
        showPlayerModal: false
      });
    }
  },

  /**
   * 移除已选择的选手
   */
  removeSelectedPlayer: function(e) {
    const index = e.currentTarget.dataset.index;
    let selectedPlayers = [...this.data.selectedPlayers];
    selectedPlayers.splice(index, 1);
    this.setData({
      selectedPlayers: selectedPlayers
    });
  },

  /**
   * 移除双打组合
   */
  removeDoublesTeam: function(e) {
    const index = e.currentTarget.dataset.index;
    let selectedPlayers = [...this.data.selectedPlayers];
    // 移除两名选手
    selectedPlayers.splice(index, 2);
    this.setData({
      selectedPlayers: selectedPlayers
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
   * 隐藏添加临时选手弹窗
   */
  hideAddTempPlayerModal: function() {
    this.setData({
      showAddTempPlayerModal: false
    });
  },

  /**
   * 临时选手姓名输入事件
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
    const { tempPlayerName, tempPlayerGender } = this.data;
    
    // 验证名称
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
    const allPlayers = this.data.allPlayers || [];
    const selectedPlayers = this.data.selectedPlayers || [];
    const nameExists = [...allPlayers, ...selectedPlayers].some(player => player.name === tempPlayerName);
    
    if (nameExists) {
      wx.showToast({
        title: '该名字在当前选手列表中已存在',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 创建临时选手对象
    const tempPlayer = {
      id: 'temp_' + Date.now(),
      name: tempPlayerName,
      gender: tempPlayerGender,
      score: 1000, // 默认分数
      isTemporary: true
    };
    
    // 添加到选手列表和已选择列表
    const allPlayersUpdated = [tempPlayer, ...this.data.allPlayers];
    const selectedPlayersUpdated = [...this.data.selectedPlayers, tempPlayer];
    
    this.setData({
      allPlayers: allPlayersUpdated,
      selectedPlayers: selectedPlayersUpdated,
      showAddTempPlayerModal: false
    });
    
    wx.showToast({
      title: '临时选手已添加',
      icon: 'success'
    });
  },

  /**
   * 生成随机轮转比赛对阵
   * 随机轮转规则：每两个人最少当过一次队友，每两个人最少当过一次对手
   */
  generateRandomMatches: function(players) {
    // 确保选手数量是偶数
    if (players.length % 2 !== 0 || players.length < 4) {
      wx.showToast({
        title: '随机轮转需要至少4名选手且为偶数',
        icon: 'none'
      });
      return [];
    }
    
    // 创建所有可能的双打组合
    const allPairs = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        allPairs.push({
          player1: players[i],
          player2: players[j]
        });
      }
    }
    
    // 创建所有可能的比赛对阵（两对选手的组合）
    const allMatches = [];
    for (let i = 0; i < allPairs.length; i++) {
      for (let j = i + 1; j < allPairs.length; j++) {
        // 检查两对选手是否有重复的选手
        const pair1 = allPairs[i];
        const pair2 = allPairs[j];
        
        // 如果两对选手没有重复的选手，则可以形成一场比赛
        if (
          pair1.player1.id !== pair2.player1.id &&
          pair1.player1.id !== pair2.player2.id &&
          pair1.player2.id !== pair2.player1.id &&
          pair1.player2.id !== pair2.player2.id
        ) {
          allMatches.push({
            leftTeam: [pair1.player1, pair1.player2],
            rightTeam: [pair2.player1, pair2.player2],
            leftScore: 0,
            rightScore: 0,
            completed: false
          });
        }
      }
    }
    
    // 如果没有可能的比赛，返回空数组
    if (allMatches.length === 0) {
      return [];
    }
    
    // 使用贪心算法选择比赛
    const selectedMatches = [];
    
    // 记录每对选手作为队友的次数
    const teammateCount = {};
    // 记录每对选手作为对手的次数
    const opponentCount = {};
    
    // 初始化计数
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const pairKey = `${players[i].id}-${players[j].id}`;
        teammateCount[pairKey] = 0;
        opponentCount[pairKey] = 0;
      }
    }
    
    // 随机打乱所有可能的比赛
    const shuffledMatches = this.shuffleArray([...allMatches]);
    
    // 贪心选择比赛，优先选择能让更多选手成为队友和对手的比赛
    while (true) {
      // 检查是否所有选手对都已经当过队友和对手
      let allTeammatesFulfilled = true;
      let allOpponentsFulfilled = true;
      
      for (const key in teammateCount) {
        if (teammateCount[key] === 0) {
          allTeammatesFulfilled = false;
          break;
        }
      }
      
      for (const key in opponentCount) {
        if (opponentCount[key] === 0) {
          allOpponentsFulfilled = false;
          break;
        }
      }
      
      if (allTeammatesFulfilled && allOpponentsFulfilled) {
        break; // 所有条件都满足了
      }
      
      // 找出最佳的下一场比赛
      let bestMatch = null;
      let bestScore = -1;
      
      for (const match of shuffledMatches) {
        if (selectedMatches.some(m => this.matchesEqual(m, match))) {
          continue; // 跳过已选择的比赛
        }
        
        // 计算这场比赛的分数（能填补多少队友和对手关系）
        let score = 0;
        
        // 检查队友关系
        const teammateKeys = [
          `${match.leftTeam[0].id}-${match.leftTeam[1].id}`,
          `${match.rightTeam[0].id}-${match.rightTeam[1].id}`
        ];
        
        for (const key of teammateKeys) {
          if (teammateCount[key] === 0) {
            score += 10; // 优先考虑未成为队友的选手对
          }
        }
        
        // 检查对手关系
        const opponentKeys = [
          `${match.leftTeam[0].id}-${match.rightTeam[0].id}`,
          `${match.leftTeam[0].id}-${match.rightTeam[1].id}`,
          `${match.leftTeam[1].id}-${match.rightTeam[0].id}`,
          `${match.leftTeam[1].id}-${match.rightTeam[1].id}`
        ];
        
        for (const key of opponentKeys) {
          // 确保key的格式是id小的在前，id大的在后
          const [id1, id2] = key.split('-');
          const normalizedKey = id1 < id2 ? key : `${id2}-${id1}`;
          
          if (opponentCount[normalizedKey] === 0) {
            score += 5; // 优先考虑未成为对手的选手对
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = match;
        }
      }
      
      if (bestMatch === null) {
        break; // 没有更多可以改善的比赛了
      }
      
      // 添加最佳比赛
      selectedMatches.push(bestMatch);
      
      // 更新队友和对手计数
      const leftTeammateKey = `${bestMatch.leftTeam[0].id}-${bestMatch.leftTeam[1].id}`;
      const rightTeammateKey = `${bestMatch.rightTeam[0].id}-${bestMatch.rightTeam[1].id}`;
      
      teammateCount[leftTeammateKey]++;
      teammateCount[rightTeammateKey]++;
      
      // 更新对手关系
      this.updateOpponentCount(opponentCount, bestMatch.leftTeam[0], bestMatch.rightTeam[0]);
      this.updateOpponentCount(opponentCount, bestMatch.leftTeam[0], bestMatch.rightTeam[1]);
      this.updateOpponentCount(opponentCount, bestMatch.leftTeam[1], bestMatch.rightTeam[0]);
      this.updateOpponentCount(opponentCount, bestMatch.leftTeam[1], bestMatch.rightTeam[1]);
      
      // 如果比赛数量达到上限，就停止
      if (selectedMatches.length >= 14 && players.length === 8) {
        break;
      }
    }
    
    return selectedMatches;
  },
  
  /**
   * 更新对手计数
   */
  updateOpponentCount: function(opponentCount, player1, player2) {
    const id1 = player1.id;
    const id2 = player2.id;
    const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    opponentCount[key] = (opponentCount[key] || 0) + 1;
  },
  
  /**
   * 检查两场比赛是否相同
   */
  matchesEqual: function(match1, match2) {
    // 检查左队是否相同
    const leftTeamEqual = 
      (match1.leftTeam[0].id === match2.leftTeam[0].id && match1.leftTeam[1].id === match2.leftTeam[1].id) ||
      (match1.leftTeam[0].id === match2.leftTeam[1].id && match1.leftTeam[1].id === match2.leftTeam[0].id);
    
    // 检查右队是否相同
    const rightTeamEqual = 
      (match1.rightTeam[0].id === match2.rightTeam[0].id && match1.rightTeam[1].id === match2.rightTeam[1].id) ||
      (match1.rightTeam[0].id === match2.rightTeam[1].id && match1.rightTeam[1].id === match2.rightTeam[0].id);
    
    // 检查交叉情况（左队等于右队，右队等于左队）
    const crossEqual = 
      (match1.leftTeam[0].id === match2.rightTeam[0].id && match1.leftTeam[1].id === match2.rightTeam[1].id ||
       match1.leftTeam[0].id === match2.rightTeam[1].id && match1.leftTeam[1].id === match2.rightTeam[0].id) &&
      (match1.rightTeam[0].id === match2.leftTeam[0].id && match1.rightTeam[1].id === match2.leftTeam[1].id ||
       match1.rightTeam[0].id === match2.leftTeam[1].id && match1.rightTeam[1].id === match2.leftTeam[0].id);
    
    return (leftTeamEqual && rightTeamEqual) || crossEqual;
  },

  /**
   * 随机打乱数组
   */
  shuffleArray: function(array) {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;
    
    // 当还有元素未打乱时
    while (0 !== currentIndex) {
      // 随机选择一个剩余元素
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      
      // 交换当前元素和随机选择的元素
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    
    return array;
  },

  /**
   * 显示分数输入弹窗
   */
  showScoreInput: function(e) {
    const matchIndex = e.currentTarget.dataset.matchIndex;
    const match = this.data.matches[matchIndex];
    
    this.setData({
      showScoreModal: true,
      currentMatchIndex: matchIndex,
      tempLeftScore: match.leftScore === 0 ? '' : match.leftScore.toString(),
      tempRightScore: match.rightScore === 0 ? '' : match.rightScore.toString(),
      currentInputSide: 'left'
    });
  },

  /**
   * 隐藏分数输入弹窗
   */
  hideScoreModal: function() {
    this.setData({
      showScoreModal: false
    });
  },

  /**
   * 设置当前激活的分数输入框
   */
  setActiveScoreInput: function(e) {
    const side = e.currentTarget.dataset.side;
    this.setData({
      currentInputSide: side
    });
  },

  /**
   * 快速输入数字
   */
  inputQuickNumber: function(e) {
    const number = e.currentTarget.dataset.number;
    const { currentInputSide } = this.data;
    
    if (currentInputSide === 'left') {
      this.setData({
        tempLeftScore: number.toString()
      });
    } else {
      this.setData({
        tempRightScore: number.toString()
      });
    }
  },

  /**
   * 输入数字
   */
  inputNumber: function(e) {
    const number = e.currentTarget.dataset.number;
    const { currentInputSide, tempLeftScore, tempRightScore } = this.data;
    
    if (currentInputSide === 'left') {
      let score = tempLeftScore.toString();
      // 最多允许两位数
      if (score.length < 2) {
        // 如果当前是0，则替换为新数字
        if (score === '0') {
          score = number.toString();
        } else {
          score += number;
        }
        this.setData({
          tempLeftScore: score
        });
      }
    } else {
      let score = tempRightScore.toString();
      // 最多允许两位数
      if (score.length < 2) {
        // 如果当前是0，则替换为新数字
        if (score === '0') {
          score = number.toString();
        } else {
          score += number;
        }
        this.setData({
          tempRightScore: score
        });
      }
    }
  },

  /**
   * 清空数字
   */
  clearNumber: function() {
    const { currentInputSide } = this.data;
    
    if (currentInputSide === 'left') {
      this.setData({
        tempLeftScore: '0'
      });
    } else {
      this.setData({
        tempRightScore: '0'
      });
    }
  },

  /**
   * 删除数字
   */
  deleteNumber: function() {
    const { currentInputSide, tempLeftScore, tempRightScore } = this.data;
    
    if (currentInputSide === 'left') {
      let score = tempLeftScore.toString();
      if (score.length > 0) {
        score = score.slice(0, -1);
        if (score === '') {
          score = '0';
        }
        this.setData({
          tempLeftScore: score
        });
      }
    } else {
      let score = tempRightScore.toString();
      if (score.length > 0) {
        score = score.slice(0, -1);
        if (score === '') {
          score = '0';
        }
        this.setData({
          tempRightScore: score
        });
      }
    }
  },

  /**
   * 确认比分
   */
  confirmScore: function() {
    const { currentMatchIndex, tempLeftScore, tempRightScore, matches, ongoingMatches } = this.data;
    
    // 验证输入
    if (!tempLeftScore || !tempRightScore) {
      wx.showToast({
        title: '请输入比分',
        icon: 'none'
      });
      return;
    }
    
    const leftScore = parseInt(tempLeftScore);
    const rightScore = parseInt(tempRightScore);
    
    // 验证比分
    if (isNaN(leftScore) || isNaN(rightScore) || leftScore < 0 || rightScore < 0) {
      wx.showToast({
        title: '比分无效',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前比赛
    const currentMatch = matches[currentMatchIndex];
    
    // 更新比分
    currentMatch.leftScore = leftScore;
    currentMatch.rightScore = rightScore;
    currentMatch.completed = true;
    
    // 将当前比赛添加到 ongoingMatches
    ongoingMatches.push(currentMatch);
    
    // 更新状态
    this.setData({
      matches: matches,
      ongoingMatches: ongoingMatches,
      showScoreModal: false,
      tempLeftScore: '',
      tempRightScore: ''
    });
    
    // 保存比赛记录
    this.saveMatches();
    
    // 不再自动显示结果，即使所有比赛都已完成
    // 只显示下一场比赛
    this.showNextMatch();
  },

  /**
   * 检查是否所有比赛都已完成
   */
  checkAllMatchesCompleted: function() {
    const { matches } = this.data;
    return matches.every(match => match.completed);
  },

  /**
   * 显示下一场比赛
   */
  showNextMatch: function() {
    const { matches } = this.data;
    
    // 找到第一个未完成的比赛
    const nextMatchIndex = matches.findIndex(match => !match.completed);
    
    if (nextMatchIndex !== -1) {
      // 滚动到下一场比赛
      wx.createSelectorQuery()
        .select(`#match-${nextMatchIndex}`)
        .boundingClientRect(rect => {
          if (rect) {
            wx.pageScrollTo({
              scrollTop: rect.top,
              duration: 300
            });
          }
        })
        .exec();
    }
  },

  /**
   * 显示结果
   */
  showResults: function() {
    this.calculateResults();
  },

  /**
   * 结束比赛
   */
  endTournament: function() {
    const { matches, selectedPlayers, mode } = this.data;
    
    // 检查是否所有比赛都已完成
    const allCompleted = matches.every(match => match.completed);
    
    if (!allCompleted) {
      wx.showModal({
        title: '提示',
        content: '还有比赛未完成，确定要结束比赛吗？',
        success: (res) => {
          if (res.confirm) {
            this.calculateResults();
          }
        }
      });
    } else {
      this.calculateResults();
    }
  },

  /**
   * 计算比赛结果
   */
  calculateResults: function() {
    const { matches, selectedPlayers, mode } = this.data;
    
    // 初始化选手结果
    const playerStats = {};
    
    // 为每个选手创建初始统计数据
    selectedPlayers.forEach(player => {
      playerStats[player.id] = {
        id: player.id,
        name: player.name,
        gender: player.gender,
        wins: 0,
        losses: 0,
        scoreDiff: 0, // 净胜分
        netWins: 0    // 净胜场（胜场-负场）
      };
    });
    
    // 统计每场比赛的结果
    matches.forEach(match => {
      if (!match.completed) return;
      
      // 判断胜负
      const leftWin = match.leftScore > match.rightScore;
      const scoreDiff = match.leftScore - match.rightScore; // 分差
      
      // 更新左队选手统计
      match.leftTeam.forEach(player => {
        if (leftWin) {
          playerStats[player.id].wins += 1;
          playerStats[player.id].scoreDiff += Math.abs(scoreDiff); // 胜利方加上分差
        } else {
          playerStats[player.id].losses += 1;
          playerStats[player.id].scoreDiff -= Math.abs(scoreDiff); // 失败方减去分差
        }
        // 计算净胜场
        playerStats[player.id].netWins = playerStats[player.id].wins - playerStats[player.id].losses;
      });
      
      // 更新右队选手统计
      match.rightTeam.forEach(player => {
        if (!leftWin) {
          playerStats[player.id].wins += 1;
          playerStats[player.id].scoreDiff += Math.abs(scoreDiff); // 胜利方加上分差
        } else {
          playerStats[player.id].losses += 1;
          playerStats[player.id].scoreDiff -= Math.abs(scoreDiff); // 失败方减去分差
        }
        // 计算净胜场
        playerStats[player.id].netWins = playerStats[player.id].wins - playerStats[player.id].losses;
      });
      
      // 将比赛记录添加到全局比赛历史
      this.saveMatchToHistory(match);
    });
    
    // 转换为数组并按新规则排序
    const results = Object.values(playerStats).sort((a, b) => {
      // 首先按净胜场排序
      if (a.netWins !== b.netWins) {
        return b.netWins - a.netWins;
      }
      // 其次按净胜分排序
      return b.scoreDiff - a.scoreDiff;
    });
    
    // 更新页面状态
    this.setData({
      playerResults: results,
      showResultModal: true
    });
    
    // 清除进行中的比赛数据
    if (mode === 'mixed') {
      wx.removeStorageSync('ongoingMixedRandomMatch');
    } else {
      wx.removeStorageSync('ongoingRandomRotationMatch');
    }
  },

  /**
   * 将比赛记录保存到历史记录
   */
  saveMatchToHistory: function(match) {
    const mode = this.data.mode;
    
    // 创建比赛记录对象
    const matchRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date: new Date().toISOString(),
      leftTeam: match.leftTeam,
      rightTeam: match.rightTeam,
      leftScore: match.leftScore,
      rightScore: match.rightScore,
      winner: match.leftScore > match.rightScore ? 'left' : 'right',
      matchType: mode === 'mixed' ? '混双轮转' : '随机轮转'
    };

    // 使用ELO系统更新积分，并获取积分变化值
    const scoreChanges = app.submitMatch(matchRecord);
    
    // 将积分变化值添加到比赛记录中
    matchRecord.winnerChange = scoreChanges.winnerChange;
    matchRecord.loserChange = scoreChanges.loserChange;

    // 更新全局比赛记录
    const matchHistory = [...app.globalData.matchHistory, matchRecord];
    app.globalData.matchHistory = matchHistory;
    
    // 保存到本地存储
    wx.setStorageSync('matchHistory', matchHistory);
  },

  /**
   * 隐藏排名结果弹窗
   */
  hideResultModal: function() {
    this.setData({
      showResultModal: false
    });
  },

  /**
   * 确认结果
   */
  confirmResults: function() {
    const { mode } = this.data;
    
    // 如果是从结束比赛进入的排名弹窗，则返回主页
    if (mode === 'mixed') {
      if (!wx.getStorageSync('ongoingMixedRandomMatch')) {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    } else {
      if (!wx.getStorageSync('ongoingRandomRotationMatch')) {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }
    
    this.setData({
      showResultModal: false
    });
  },

  /**
   * 显示当前排名
   */
  showCurrentRanking: function() {
    const { matches, selectedPlayers, mode } = this.data;
    
    // 初始化选手结果
    const playerStats = {};
    
    // 为每个选手创建初始统计数据
    selectedPlayers.forEach(player => {
      playerStats[player.id] = {
        id: player.id,
        name: player.name,
        gender: player.gender,
        wins: 0,
        losses: 0,
        scoreDiff: 0, // 净胜分
        netWins: 0    // 净胜场（胜场-负场）
      };
    });
    
    // 统计已完成比赛的结果
    matches.forEach(match => {
      if (!match.completed) return;
      
      // 判断胜负
      const leftWin = match.leftScore > match.rightScore;
      const scoreDiff = match.leftScore - match.rightScore; // 分差
      
      // 更新左队选手统计
      match.leftTeam.forEach(player => {
        if (leftWin) {
          playerStats[player.id].wins += 1;
          playerStats[player.id].scoreDiff += Math.abs(scoreDiff); // 胜利方加上分差
        } else {
          playerStats[player.id].losses += 1;
          playerStats[player.id].scoreDiff -= Math.abs(scoreDiff); // 失败方减去分差
        }
        // 计算净胜场
        playerStats[player.id].netWins = playerStats[player.id].wins - playerStats[player.id].losses;
      });
      
      // 更新右队选手统计
      match.rightTeam.forEach(player => {
        if (!leftWin) {
          playerStats[player.id].wins += 1;
          playerStats[player.id].scoreDiff += Math.abs(scoreDiff); // 胜利方加上分差
        } else {
          playerStats[player.id].losses += 1;
          playerStats[player.id].scoreDiff -= Math.abs(scoreDiff); // 失败方减去分差
        }
        // 计算净胜场
        playerStats[player.id].netWins = playerStats[player.id].wins - playerStats[player.id].losses;
      });
    });
    
    // 转换为数组并按新规则排序
    const results = Object.values(playerStats).sort((a, b) => {
      // 首先按净胜场排序
      if (a.netWins !== b.netWins) {
        return b.netWins - a.netWins;
      }
      // 其次按净胜分排序
      return b.scoreDiff - a.scoreDiff;
    });
    
    console.log('当前排名计算结果:', results);
    
    // 更新页面状态并显示排名弹窗
    this.setData({
      playerResults: results,
      showResultModal: true
    });
  },

  /**
   * 生成混双轮转比赛对阵
   * 混双轮转规则：每场比赛的队伍由一男一女组成，尽量让每个人都和不同的异性搭档
   */
  generateMixedRandomMatches: function(players) {
    // 分离男女选手
    const malePlayers = players.filter(p => p.gender === 'male');
    const femalePlayers = players.filter(p => p.gender === 'female');
    
    // 确保有足够的男女选手
    if (malePlayers.length < 2 || femalePlayers.length < 2) {
      wx.showToast({
        title: '混双模式至少需要2名男选手和2名女选手',
        icon: 'none',
        duration: 2000
      });
      return [];
    }
    
    // 创建所有可能的混双组合
    const allPairs = [];
    for (let i = 0; i < malePlayers.length; i++) {
      for (let j = 0; j < femalePlayers.length; j++) {
        allPairs.push({
          male: malePlayers[i],
          female: femalePlayers[j]
        });
      }
    }
    
    console.log(`生成了 ${allPairs.length} 个混双组合`);
    
    // 创建所有可能的比赛对阵（两对混双的组合）
    const allMatches = [];
    for (let i = 0; i < allPairs.length; i++) {
      for (let j = i + 1; j < allPairs.length; j++) {
        // 检查两对混双是否有重复的选手
        const pair1 = allPairs[i];
        const pair2 = allPairs[j];
        
        // 如果两对混双没有重复的选手，则可以形成一场比赛
        if (
          pair1.male.id !== pair2.male.id &&
          pair1.female.id !== pair2.female.id
        ) {
          allMatches.push({
            leftTeam: [pair1.male, pair1.female],
            rightTeam: [pair2.male, pair2.female],
            leftScore: 0,
            rightScore: 0,
            completed: false
          });
        }
      }
    }
    
    console.log(`生成了 ${allMatches.length} 场可能的比赛`);
    
    // 如果没有可能的比赛，返回空数组
    if (allMatches.length === 0) {
      return [];
    }
    
    // 使用贪心算法选择比赛
    const selectedMatches = [];
    
    // 记录每个选手参与的比赛次数
    const playerMatchCount = {};
    players.forEach(player => {
      playerMatchCount[player.id] = 0;
    });
    
    // 记录每对搭档组合的次数
    const partnerCount = {};
    
    // 随机打乱所有可能的比赛
    const shuffledMatches = this.shuffleArray([...allMatches]);
    
    // 计算理论最小比赛场数
    // 对于N男N女，理论上最少需要N^2场比赛
    const minMatches = Math.max(9, Math.min(malePlayers.length, femalePlayers.length) ** 2);
    console.log(`理论最小比赛场数: ${minMatches}`);
    
    // 贪心选择比赛，优先选择参与次数少的选手
    while (shuffledMatches.length > 0) {
      // 找出最佳的下一场比赛
      let bestMatch = null;
      let bestScore = -1;
      let bestMatchIndex = -1;
      
      for (let i = 0; i < shuffledMatches.length; i++) {
        const match = shuffledMatches[i];
        
        // 计算这场比赛的分数（参与次数少的选手得分高）
        let score = 0;
        
        // 左队选手
        const leftMale = match.leftTeam[0];
        const leftFemale = match.leftTeam[1];
        // 右队选手
        const rightMale = match.rightTeam[0];
        const rightFemale = match.rightTeam[1];
        
        // 计算选手参与次数的得分
        score += 10 / (1 + playerMatchCount[leftMale.id]);
        score += 10 / (1 + playerMatchCount[leftFemale.id]);
        score += 10 / (1 + playerMatchCount[rightMale.id]);
        score += 10 / (1 + playerMatchCount[rightFemale.id]);
        
        // 计算搭档组合的得分
        const leftPartnerKey = `${leftMale.id}-${leftFemale.id}`;
        const rightPartnerKey = `${rightMale.id}-${rightFemale.id}`;
        
        score += 5 / (1 + (partnerCount[leftPartnerKey] || 0));
        score += 5 / (1 + (partnerCount[rightPartnerKey] || 0));
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = match;
          bestMatchIndex = i;
        }
      }
      
      if (bestMatch === null) {
        break; // 没有更多可以改善的比赛了
      }
      
      // 添加最佳比赛
      selectedMatches.push(bestMatch);
      
      // 从候选比赛中移除这场比赛
      shuffledMatches.splice(bestMatchIndex, 1);
      
      // 更新选手参与次数
      const leftMale = bestMatch.leftTeam[0];
      const leftFemale = bestMatch.leftTeam[1];
      const rightMale = bestMatch.rightTeam[0];
      const rightFemale = bestMatch.rightTeam[1];
      
      playerMatchCount[leftMale.id]++;
      playerMatchCount[leftFemale.id]++;
      playerMatchCount[rightMale.id]++;
      playerMatchCount[rightFemale.id]++;
      
      // 更新搭档组合次数
      const leftPartnerKey = `${leftMale.id}-${leftFemale.id}`;
      const rightPartnerKey = `${rightMale.id}-${rightFemale.id}`;
      
      partnerCount[leftPartnerKey] = (partnerCount[leftPartnerKey] || 0) + 1;
      partnerCount[rightPartnerKey] = (partnerCount[rightPartnerKey] || 0) + 1;
      
      // 如果已经达到理论最小比赛场数，检查每个选手是否至少参与了2场比赛
      if (selectedMatches.length >= minMatches) {
        let allPlayersHaveEnoughMatches = true;
        for (const playerId in playerMatchCount) {
          if (playerMatchCount[playerId] < 2) {
            allPlayersHaveEnoughMatches = false;
            break;
          }
        }
        
        if (allPlayersHaveEnoughMatches) {
          console.log(`已选择 ${selectedMatches.length} 场比赛，所有选手都至少参与了2场比赛`);
          break;
        }
      }
      
      // 如果比赛数量达到上限，就停止
      if (selectedMatches.length >= 30) {
        console.log(`已达到最大比赛场数上限: 30场`);
        break;
      }
    }
    
    console.log(`最终选择了 ${selectedMatches.length} 场比赛`);
    return selectedMatches;
  },

  /**
   * 保存比赛记录到本地存储
   */
  saveMatches: function() {
    const { matches, selectedPlayers, mode } = this.data;
    
    // 根据当前模式选择正确的存储键
    const storageKey = mode === 'mixed' ? 'ongoingMixedRandomMatch' : 'ongoingRandomRotationMatch';
    
    // 创建要保存的比赛记录对象
    const matchRecord = {
      mode: mode,
      selectedPlayers: selectedPlayers,
      matches: matches,
      timestamp: new Date().getTime()
    };
    
    // 保存到本地存储
    try {
      wx.setStorageSync(storageKey, matchRecord);
      console.log(`保存比赛记录成功: ${mode} 模式`);
    } catch (e) {
      console.error('保存比赛记录失败:', e);
      wx.showToast({
        title: '保存比赛记录失败',
        icon: 'none',
        duration: 2000
      });
    }
  }
});