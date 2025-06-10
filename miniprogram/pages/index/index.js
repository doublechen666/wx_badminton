// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 分数数据
    leftScore: 0,
    rightScore: 0,
    
    // 选手数据
    leftPlayers: [],
    rightPlayers: [],
    allPlayers: [], // 所有已注册选手
    
    // 控制模态框显示
    showScoreModal: false,
    showPlayerModal: false,
    showAddPlayerModal: false,
    
    // 临时数据
    tempScore: '',
    currentSide: '', // 当前操作的是左侧还是右侧
    currentPlayerIndex: 0, // 当前选择的是第几个选手
    newPlayerName: '', // 新添加的选手名字
    tempSelectedPlayers: [],
    showMatchModeModal: false,
    showMatchTypeModal: false,
    selectedMatchMode: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 清除可能存在的进行中比赛
    wx.removeStorageSync('ongoingRandomRotationMatch');
    wx.removeStorageSync('ongoingMixedRandomMatch');
    
    // 清除可能存在的混双轮转比赛存储
    wx.removeStorageSync('ongoingMixedRandomMatch');
    
    // 清除可能存在的单打比赛存储
    wx.removeStorageSync('ongoingSinglesMatch');
    
    // 清除可能存在的小组赛存储
    wx.removeStorageSync('ongoingGroupMatch');
    
    // 清除可能存在的循环赛存储
    wx.removeStorageSync('ongoingRoundRobinMatch');
    
    // 初始化用户信息
    this.initUserInfo();
    
    // 检查是否有进行中的比赛
    this.checkOngoingMatches();
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次页面显示时，刷新全局数据
    const players = wx.getStorageSync('players') || [];
    app.globalData.players = players;
    
    this.setData({
      allPlayers: players
    });
    
    // 检查是否有进行中的比赛
    this.checkOngoingMatches();
  },

  /**
   * 检查是否有进行中的比赛，如果有则直接跳转
   */
  checkOngoingMatches: function() {
    // 检查进行中的大循环赛
    const ongoingRoundRobinMatch = wx.getStorageSync('ongoingRoundRobinMatch');
    if (ongoingRoundRobinMatch) {
      wx.redirectTo({
        url: `/pages/round_robin/round_robin?mode=${ongoingRoundRobinMatch.mode}&tournament_type=round_robin`,
        success: function() {
          console.log('成功跳转到进行中的大循环页面');
        },
        fail: function(error) {
          console.error('跳转到大循环页面失败:', error);
        }
      });
      return;
    }
    
    // 检查进行中的瑞士轮大循环赛
    const ongoingSwissMatch = wx.getStorageSync('ongoingSwissMatch');
    if (ongoingSwissMatch) {
      wx.redirectTo({
        url: `/pages/round_robin/round_robin?mode=${ongoingSwissMatch.mode}&tournament_type=swiss`,
        success: function() {
          console.log('成功跳转到进行中的瑞士轮页面');
        },
        fail: function(error) {
          console.error('跳转到瑞士轮页面失败:', error);
        }
      });
      return;
    }
    
    // 检查进行中的随机轮转赛
    const ongoingRandomRotationMatch = wx.getStorageSync('ongoingRandomRotationMatch');
    if (ongoingRandomRotationMatch) {
      wx.redirectTo({
        url: `/pages/random_rotation/random_rotation?mode=${ongoingRandomRotationMatch.mode}`,
        success: function() {
          console.log('成功跳转到进行中的随机轮转页面');
        },
        fail: function(error) {
          console.error('跳转到随机轮转页面失败:', error);
        }
      });
      return;
    }
    
    // 检查进行中的混双轮转赛
    const ongoingMixedRandomMatch = wx.getStorageSync('ongoingMixedRandomMatch');
    if (ongoingMixedRandomMatch) {
      wx.redirectTo({
        url: `/pages/random_rotation/random_rotation?mode=mixed`,
        success: function() {
          console.log('成功跳转到进行中的混双轮转页面');
        },
        fail: function(error) {
          console.error('跳转到混双轮转页面失败:', error);
        }
      });
      return;
    }
  },

  /**
   * 初始化用户信息
   */
  initUserInfo: function() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    
    if (userInfo) {
      // 如果有用户信息，获取选手数据
      const players = wx.getStorageSync('players') || [];
      app.globalData.players = players;
      
      // 更新页面数据
      this.setData({
        allPlayers: players
      });
      
      console.log('用户信息初始化成功');
    } else {
      console.log('未找到用户信息');
    }
  },

  /**
   * 显示分数输入框
   */
  showScoreInput: function (e) {
    const side = e.currentTarget.dataset.side;
    this.setData({
      showScoreModal: true,
      currentSide: side,
      tempScore: side === 'left' ? this.data.leftScore : this.data.rightScore
    });
  },

  /**
   * 隐藏分数输入框
   */
  hideScoreModal: function () {
    this.setData({
      showScoreModal: false
    });
  },

  /**
   * 监听分数输入
   */
  onScoreInput: function (e) {
    this.setData({
      tempScore: e.detail.value
    });
  },

  /**
   * 快速选择分数
   */
  quickSelectScore: function (e) {
    const score = e.currentTarget.dataset.score;
    this.setData({
      tempScore: score
    });
  },

  /**
   * 输入分数数字
   */
  inputScoreDigit: function (e) {
    const digit = e.currentTarget.dataset.digit;
    let score = this.data.tempScore.toString();
    
    // 最多允许两位数
    if (score.length < 2) {
      score += digit;
      this.setData({
        tempScore: parseInt(score)
      });
    }
  },

  /**
   * 清空分数输入
   */
  clearScoreInput: function () {
    this.setData({
      tempScore: 0
    });
  },

  /**
   * 确认输入的分数
   */
  confirmScore: function () {
    if (this.data.currentSide === 'left') {
      this.setData({
        leftScore: parseInt(this.data.tempScore) || 0,
        showScoreModal: false
      });
    } else {
      this.setData({
        rightScore: parseInt(this.data.tempScore) || 0,
        showScoreModal: false
      });
    }
  },

  /**
   * 选择选手
   */
  selectPlayer: function (e) {
    const side = e.currentTarget.dataset.side;
    const index = e.currentTarget.dataset.index !== undefined ? e.currentTarget.dataset.index : 0;
    
    // 初始化临时选择为当前已选择的选手
    let initialSelection = [];
    if (side === 'left' && this.data.leftPlayers.length > 0) {
      initialSelection = [...this.data.leftPlayers];
    } else if (side === 'right' && this.data.rightPlayers.length > 0) {
      initialSelection = [...this.data.rightPlayers];
    }

    this.setData({
      showPlayerModal: true,
      currentSide: side,
      currentPlayerIndex: index,
      tempSelectedPlayers: initialSelection
    });
  },

  /**
   * 隐藏选手选择框
   */
  hidePlayerModal: function () {
    this.setData({
      showPlayerModal: false
    });
  },

  /**
   * 切换选手选择状态
   */
  togglePlayerSelection: function (e) {
    const player = e.currentTarget.dataset.player;
    let tempSelected = [...this.data.tempSelectedPlayers];
    
    // 检查是否已选择
    const index = tempSelected.findIndex(p => p.id === player.id);
    
    if (index !== -1) {
      // 已选择，取消选择
      tempSelected.splice(index, 1);
    } else {
      // 未选择，添加选择(但不超过2个)
      if (tempSelected.length < 2) {
        tempSelected.push(player);
      } else {
        wx.showToast({
          title: '最多选择2名选手',
          icon: 'none'
        });
        return;
      }
    }
    
    this.setData({
      tempSelectedPlayers: tempSelected
    });
  },

  /**
   * 检查选手是否被选中
   */
  isPlayerSelected: function(player) {
    return this.data.tempSelectedPlayers.some(p => p.id === player.id);
  },

  /**
   * 确认选手选择
   */
  confirmPlayerSelection: function() {
    const { currentSide } = this.data;
    
    if (currentSide === 'left') {
      this.setData({
        leftPlayers: this.data.tempSelectedPlayers,
        showPlayerModal: false
      });
    } else {
      this.setData({
        rightPlayers: this.data.tempSelectedPlayers,
        showPlayerModal: false
      });
    }
  },

  /**
   * 清除选中的选手
   */
  clearSelectedPlayers: function() {
    this.setData({
      tempSelectedPlayers: []
    });
  },

  /**
   * 显示添加新选手的界面
   */
  showAddPlayer: function () {
    this.setData({
      showPlayerModal: false,
      showAddPlayerModal: true,
      newPlayerName: ''
    });
  },

  /**
   * 隐藏添加新选手的界面
   */
  hideAddPlayerModal: function () {
    this.setData({
      showAddPlayerModal: false,
      showPlayerModal: true
    });
  },

  /**
   * 监听新选手名字输入
   */
  onNewPlayerNameInput: function (e) {
    this.setData({
      newPlayerName: e.detail.value
    });
  },

  /**
   * 添加新选手
   */
  addNewPlayer: function () {
    if (!this.data.newPlayerName.trim()) {
      wx.showToast({
        title: '请输入选手姓名',
        icon: 'none'
      });
      return;
    }

    // 创建新选手
    const newPlayer = {
      id: Date.now().toString(),
      name: this.data.newPlayerName,
      avatarUrl: '/images/default-avatar.png',
      wins: 0,
      losses: 0,
      points: 0
    };

    // 更新全局数据和本地数据
    const allPlayers = [...app.globalData.players, newPlayer];
    app.globalData.players = allPlayers;
    
    // 保存到本地存储
    wx.setStorageSync('players', allPlayers);

    // 更新页面数据
    this.setData({
      allPlayers: allPlayers,
      showAddPlayerModal: false,
      showPlayerModal: true
    });

    wx.showToast({
      title: '添加选手成功',
      icon: 'success'
    });
  },

  /**
   * 提交比赛结果
   */
  submitMatch: function () {
    // 验证是否选择了选手
    if (!this.data.leftPlayers.length || !this.data.rightPlayers.length) {
      wx.showToast({
        title: '请选择选手',
        icon: 'none'
      });
      return;
    }

    // 验证双方选手数量是否一致（单打或双打）
    if (this.data.leftPlayers.length !== this.data.rightPlayers.length) {
      wx.showToast({
        title: '双方选手数量必须相同',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 验证分数是否填写
    if (this.data.leftScore === 0 && this.data.rightScore === 0) {
      wx.showToast({
        title: '请填写比分',
        icon: 'none'
      });
      return;
    }

    // 创建比赛记录对象
    const matchRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      leftTeam: this.data.leftPlayers,
      rightTeam: this.data.rightPlayers,
      leftScore: this.data.leftScore,
      rightScore: this.data.rightScore,
      winner: this.data.leftScore > this.data.rightScore ? 'left' : 'right'
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

    // 重置页面数据
    this.resetMatchData();

    wx.showToast({
      title: '提交比赛成功',
      icon: 'success'
    });
  },

  /**
   * 重置比赛数据
   */
  resetMatchData: function () {
    this.setData({
      leftScore: 0,
      rightScore: 0,
      leftPlayers: [],
      rightPlayers: []
    });
  },

  /**
   * 清空所有数据
   */
  clearAll: function () {
    wx.showModal({
      title: '提示',
      content: '确定要清空当前比赛数据吗？',
      success: (res) => {
        if (res.confirm) {
          this.resetMatchData();
        }
      }
    });
  },

  // 添加点击选择选手的方法
  selectPlayerItem: function (e) {
    const player = e.currentTarget.dataset.player;
    let tempSelected = [...this.data.tempSelectedPlayers];
    const currentSide = this.data.currentSide;
    
    // 检查是否已在临时选择中
    const playerIndex = tempSelected.findIndex(p => p.id === player.id);
    if (playerIndex !== -1) {
      wx.showToast({
        title: '该选手已选择',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否在对方队伍中
    const opposingSide = currentSide === 'left' ? 'right' : 'left';
    const opposingPlayers = opposingSide === 'left' ? this.data.leftPlayers : this.data.rightPlayers;
    
    if (opposingPlayers.some(p => p.id === player.id)) {
      wx.showToast({
        title: '该选手已在对方队伍',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否超过最大选择数量（2个）
    if (tempSelected.length >= 2) {
      wx.showToast({
        title: '最多选择2名选手',
        icon: 'none'
      });
      return;
    }
    
    // 添加到临时选择
    tempSelected.push(player);
    this.setData({
      tempSelectedPlayers: tempSelected
    });
  },

  // 移除已选择的选手
  removeSelectedPlayer: function (e) {
    const index = e.currentTarget.dataset.index;
    let tempSelected = [...this.data.tempSelectedPlayers];
    tempSelected.splice(index, 1);
    this.setData({
      tempSelectedPlayers: tempSelected
    });
  },

  // 确认选择的选手
  confirmSelectedPlayers: function () {
    const { currentSide, tempSelectedPlayers } = this.data;
    
    // 如果是清空操作（选择了0个选手），应该始终允许
    if (tempSelectedPlayers.length === 0) {
      // 直接执行清空操作
      if (currentSide === 'left') {
        this.setData({
          leftPlayers: [],
          showPlayerModal: false
        });
      } else {
        this.setData({
          rightPlayers: [],
          showPlayerModal: false
        });
      }
      return;
    }
    
    // 非清空操作时，获取对方队伍现有选手
    const opposingSide = currentSide === 'left' ? 'right' : 'left';
    const opposingPlayers = opposingSide === 'left' ? this.data.leftPlayers : this.data.rightPlayers;
    
    // 仅在对方存在选手且选择了不同数量选手时提示
    if (opposingPlayers.length > 0 && opposingPlayers.length !== tempSelectedPlayers.length) {
      wx.showToast({
        title: '建议选择与对方相同数量的选手',
        icon: 'none',
        duration: 2000
      });
      
      // 提示后仍然允许确认选择（只是建议，不强制）
      if (currentSide === 'left') {
        this.setData({
          leftPlayers: tempSelectedPlayers,
          showPlayerModal: false
        });
      } else {
        this.setData({
          rightPlayers: tempSelectedPlayers,
          showPlayerModal: false
        });
      }
    } else {
      // 数量一致或对方没有选手，直接设置
      if (currentSide === 'left') {
        this.setData({
          leftPlayers: tempSelectedPlayers,
          showPlayerModal: false
        });
      } else {
        this.setData({
          rightPlayers: tempSelectedPlayers,
          showPlayerModal: false
        });
      }
    }
  },

  // 添加清空当前选择的方法
  clearCurrentSidePlayers: function() {
    const {
      currentSide,
      leftPlayers,
      rightPlayers,
      showPlayerModal
    } = this.data;
    
    if (currentSide === 'left') {
      this.setData({
        leftPlayers: [],
        showPlayerModal: false
      });
    } else {
      this.setData({
        rightPlayers: [],
        showPlayerModal: false
      });
    }
  },
  
  /**
   * 显示比赛模式选择弹窗
   */
  showMatchMode: function() {
    this.setData({
      showMatchModeModal: true
    });
  },
  
  /**
   * 隐藏比赛模式选择弹窗
   */
  hideMatchModeModal: function() {
    this.setData({
      showMatchModeModal: false
    });
  },
  
  /**
   * 选择比赛模式
   */
  selectMatchMode: function(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      showMatchModeModal: false,
      showMatchTypeModal: true,
      selectedMatchMode: mode
    });
  },
  
  /**
   * 隐藏比赛类型选择弹窗
   */
  hideMatchTypeModal: function() {
    this.setData({
      showMatchTypeModal: false
    });
  },
  
  /**
   * 选择比赛类型
   */
  selectMatchType: function(e) {
    const type = e.currentTarget.dataset.type;
    const { selectedMatchMode } = this.data;
    
    this.hideMatchTypeModal();
    
    // 如果是随机轮转模式但选择的是单打模式，显示提示并返回
    if (type === 'random_rotation' && selectedMatchMode === 'singles') {
      wx.showToast({
        title: '随机轮转仅支持双打模式',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 如果是混双轮转模式但选择的是单打模式，显示提示并返回
    if (type === 'mixed_random' && selectedMatchMode === 'singles') {
      wx.showToast({
        title: '混双轮转仅支持双打模式',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (type === 'round_robin') {
      // 大循环模式
      wx.redirectTo({
        url: `/pages/round_robin/round_robin?mode=${selectedMatchMode}`,
        success: function() {
          console.log('成功跳转到大循环页面');
        },
        fail: function(error) {
          console.error('跳转到大循环页面失败:', error);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else if (type === 'swiss') {
      // 瑞士轮大循环模式
      wx.redirectTo({
        url: `/pages/round_robin/round_robin?mode=${selectedMatchMode}&tournament_type=swiss`,
        success: function() {
          console.log('成功跳转到瑞士轮页面');
        },
        fail: function(error) {
          console.error('跳转到瑞士轮页面失败:', error);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else if (type === 'random_rotation') {
      // 随机轮转模式 - 此时已确保是双打模式
      wx.redirectTo({
        url: `/pages/random_rotation/random_rotation?mode=doubles`, // 强制使用双打模式
        success: function() {
          console.log('成功跳转到随机轮转页面');
        },
        fail: function(error) {
          console.error('跳转到随机轮转页面失败:', error);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else if (type === 'mixed_random') {
      // 混双轮转模式 - 此时已确保是双打模式
      wx.redirectTo({
        url: `/pages/random_rotation/random_rotation?mode=mixed`, // 使用mixed模式参数
        success: function() {
          console.log('成功跳转到混双轮转页面');
        },
        fail: function(error) {
          console.error('跳转到混双轮转页面失败:', error);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
  }
}); 