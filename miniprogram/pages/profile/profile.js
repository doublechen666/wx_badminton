// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoggedIn: false,
    userInfo: null,
    playerInfo: null, // 存储玩家信息
    playerScore: 1000,
    playerTitle: '', // 玩家称号
    recentScoreChanges: {
      win: null,
      lose: null
    },
    
    // 控制弹窗显示
    showLoginModal: false,
    showRegisterPlayerModal: false,
    isRegisterMode: false,
    showTitleRangesModal: false, // 添加称号排位分范围弹窗控制
    
    // 称号排位分范围数据
    titleRanges: [
      { title: '初入羽境', range: '0-1499分' },
      { title: '羽翼丰满', range: '1500-1999分' },
      { title: '振羽凌空', range: '2000-2499分' },
      { title: '破羽穿云', range: '2500-2999分' },
      { title: '御羽惊雷', range: '3000-3499分' },
      { title: '贯羽千钧', range: '3500-3999分' },
      { title: '化羽流光', range: '4000-4499分' },
      { title: '极羽无界', range: '4500-4999分' },
      { title: '万羽归宗', range: '5000分以上' }
    ],
    
    // 表单数据
    loginForm: {
      username: '',
      password: '',
      confirmPassword: ''
    },
    playerForm: {
      name: '',
      avatarUrl: '',
      gender: 'male' // 默认性别为男
    },
    importText: '',
    showImportModal: false,
    showExportModal: false,
    exportedData: '',
    editingPlayerId: null,
    showPlayersListModal: false,
    playersList: [],
    filteredPlayersList: [], // 用于搜索过滤后的选手列表
    playerSearchText: '', // 选手搜索文本
    adminStats: {
      totalPlayers: 0,
      totalMatches: 0
    },
    showHistoryListModal: false,
    matchHistoryList: [],
    filteredHistoryList: [], // 用于搜索过滤后的历史记录列表
    historySearchText: '', // 历史记录搜索文本
    
    // 历史记录编辑
    showEditHistoryModal: false,
    editingHistoryId: null,
    editingHistory: {
      leftScore: '',
      rightScore: '',
      leftTeamNames: '',
      rightTeamNames: ''
    },
    
    // 导入导出设置
    exportDataTypes: {
      players: true,
      matchHistory: true
    },
    importDataTypes: {
      players: true,
      matchHistory: true
    },
    
    // 批量操作相关
    batchSelectPlayers: false,
    selectedPlayerIds: [],
    allPlayersSelected: false,
    batchSelectHistory: false,
    selectedHistoryIds: [],
    allHistorySelected: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      
      // 获取玩家积分信息
      this.getPlayerScore();
    }
  },
  
  /**
   * 根据分数计算称号
   * @param {number} score 玩家分数
   * @returns {string} 称号
   */
  getPlayerTitle: function(score) {
    if (score < 1500) {
      return "初入羽境";
    } else if (score < 2000) {
      return "羽翼丰满";
    } else if (score < 2500) {
      return "振羽凌空";
    } else if (score < 3000) {
      return "破羽穿云";
    } else if (score < 3500) {
      return "御羽惊雷";
    } else if (score < 4000) {
      return "贯羽千钧";
    } else if (score < 4500) {
      return "化羽流光";
    } else if (score < 5000) {
      return "极羽无界";
    } else {
      return "万羽归宗";
    }
  },
  
  /**
   * 显示称号对应的排位分范围
   */
  showTitleRanges: function() {
    this.setData({
      showTitleRangesModal: true
    });
  },
  
  /**
   * 隐藏称号排位分范围弹窗
   */
  hideTitleRanges: function() {
    this.setData({
      showTitleRangesModal: false
    });
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (this.data.isLoggedIn) {
      // 每次页面显示时刷新数据
      const userInfo = this.data.userInfo;
      
      if (userInfo.isAdmin) {
        // 管理员刷新统计信息
        this.getAdminStats();
      } else {
        // 普通用户刷新选手信息和胜率
        this.getPlayerInfo();
      }
      
      // 如果当前正在显示选手管理或历史记录管理，刷新这些数据
      if (this.data.showPlayersListModal) {
        this.refreshPlayersList();
      }
      
      if (this.data.showHistoryListModal) {
        this.refreshHistoryList();
      }
    }
  },
  
  /**
   * 获取玩家积分
   */
  getPlayerScore: function() {
    // 从存储中获取当前登录用户关联的选手信息
    const userInfo = this.data.userInfo;
    const allPlayers = app.globalData.players || [];
    
    // 查找与当前用户关联的选手
    const playerInfo = allPlayers.find(p => p.userId === userInfo.userId);
    
    if (playerInfo) {
      const score = playerInfo.score || 1000;
      const title = this.getPlayerTitle(score);
      
      this.setData({
        playerInfo: playerInfo,
        playerScore: score,
        playerTitle: title
      });
    }
  },
  
  /**
   * 获取玩家信息 - 增强版
   */
  getPlayerInfo: function() {
    const userInfo = this.data.userInfo;
    if (!userInfo) return;
    
    // 管理员不关联选手
    if (userInfo.isAdmin) {
      this.setData({
        playerInfo: null
      });
      return;
    }
    
    // 重要：确保从存储中获取最新数据，而不仅仅是app.globalData
    const allPlayers = wx.getStorageSync('players') || [];
    app.globalData.players = allPlayers; // 确保全局数据最新
    
    // 查找与当前用户关联的选手
    const playerInfo = allPlayers.find(p => p.userId === userInfo.userId);
    
    if (playerInfo) {
      // 创建一个深拷贝避免引用问题
      const playerInfoCopy = JSON.parse(JSON.stringify(playerInfo));
      
      // 计算称号
      const score = playerInfoCopy.score || 1000;
      const title = this.getPlayerTitle(score);
      
      // 添加胜率和详细战绩计算
      const matchHistory = wx.getStorageSync('matchHistory') || [];
      
      // 初始化统计数据
      let totalWins = playerInfoCopy.wins || 0;
      let totalLosses = playerInfoCopy.losses || 0;
      let singlesWins = 0;
      let singlesLosses = 0;
      let doublesWins = 0;
      let doublesLosses = 0;
      let maleDoublesWins = 0;
      let maleDoublesLosses = 0;
      let femaleDoublesWins = 0;
      let femaleDoublesLosses = 0;
      let mixedDoublesWins = 0;
      let mixedDoublesLosses = 0;
      
      // 分析比赛历史
      matchHistory.forEach(match => {
        // 检查玩家是否在左队
        const inLeftTeam = match.leftTeam && match.leftTeam.some(p => p.id === playerInfoCopy.id);
        // 检查玩家是否在右队
        const inRightTeam = match.rightTeam && match.rightTeam.some(p => p.id === playerInfoCopy.id);
        
        if (!inLeftTeam && !inRightTeam) {
          // 玩家不在这场比赛中
          return;
        }
        
        const isWin = (inLeftTeam && match.leftScore > match.rightScore) || 
                      (inRightTeam && match.rightScore > match.leftScore);
        
        // 确定是单打还是双打
        const isSingles = match.leftTeam && match.rightTeam && 
                          match.leftTeam.length === 1 && match.rightTeam.length === 1;
        
        if (isSingles) {
          // 单打比赛
          if (isWin) singlesWins++;
          else singlesLosses++;
        } else {
          // 双打比赛
          if (isWin) doublesWins++;
          else doublesLosses++;
          
          // 确定双打类型（男双、女双、混双）
          const team = inLeftTeam ? match.leftTeam : match.rightTeam;
          if (!team) return; // 防止undefined错误
          
          const teamMembers = team.map(p => {
            return allPlayers.find(player => player.id === p.id) || p;
          });
          
          let teamType = 'mixed'; // 默认为混双
          if (teamMembers.every(m => m.gender === 'male')) {
            teamType = 'male'; // 男双
          } else if (teamMembers.every(m => m.gender === 'female')) {
            teamType = 'female'; // 女双
          }
          
          // 根据双打类型累计胜负场次
          if (teamType === 'male') {
            if (isWin) maleDoublesWins++;
            else maleDoublesLosses++;
          } else if (teamType === 'female') {
            if (isWin) femaleDoublesWins++;
            else femaleDoublesLosses++;
          } else {
            if (isWin) mixedDoublesWins++;
            else mixedDoublesLosses++;
          }
        }
      });
      
      // 计算胜率
      const totalMatches = totalWins + totalLosses;
      const singlesMatches = singlesWins + singlesLosses;
      const doublesMatches = doublesWins + doublesLosses;
      
      playerInfoCopy.singlesWins = singlesWins;
      playerInfoCopy.singlesLosses = singlesLosses;
      playerInfoCopy.doublesWins = doublesWins;
      playerInfoCopy.doublesLosses = doublesLosses;
      playerInfoCopy.maleDoublesWins = maleDoublesWins;
      playerInfoCopy.maleDoublesLosses = maleDoublesLosses;
      playerInfoCopy.femaleDoublesWins = femaleDoublesWins;
      playerInfoCopy.femaleDoublesLosses = femaleDoublesLosses;
      playerInfoCopy.mixedDoublesWins = mixedDoublesWins;
      playerInfoCopy.mixedDoublesLosses = mixedDoublesLosses;
      
      // 计算胜率
      playerInfoCopy.winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '0%';
      playerInfoCopy.singlesWinRate = singlesMatches > 0 ? Math.round((singlesWins / singlesMatches) * 100) + '%' : '0%';
      playerInfoCopy.doublesWinRate = doublesMatches > 0 ? Math.round((doublesWins / doublesMatches) * 100) + '%' : '0%';
      
      const maleDoublesMatches = maleDoublesWins + maleDoublesLosses;
      const femaleDoublesMatches = femaleDoublesWins + femaleDoublesLosses;
      const mixedDoublesMatches = mixedDoublesWins + mixedDoublesLosses;
      
      playerInfoCopy.maleDoublesWinRate = maleDoublesMatches > 0 ? Math.round((maleDoublesWins / maleDoublesMatches) * 100) + '%' : '0%';
      playerInfoCopy.femaleDoublesWinRate = femaleDoublesMatches > 0 ? Math.round((femaleDoublesWins / femaleDoublesMatches) * 100) + '%' : '0%';
      playerInfoCopy.mixedDoublesWinRate = mixedDoublesMatches > 0 ? Math.round((mixedDoublesWins / mixedDoublesMatches) * 100) + '%' : '0%';
      
      // 更新玩家信息
      this.setData({
        playerInfo: playerInfoCopy,
        playerScore: playerInfoCopy.score || 1000,
        playerTitle: this.getPlayerTitle(playerInfoCopy.score || 1000)
      });
    } else {
      this.setData({
        playerInfo: null,
        playerScore: 1000,
        playerTitle: this.getPlayerTitle(1000)
      });
    }
  },
  
  /**
   * 显示登录弹窗
   */
  showLoginModal: function() {
    this.setData({
      showLoginModal: true,
      isRegisterMode: false,
      loginForm: {
        username: '',
        password: '',
        confirmPassword: ''
      }
    });
  },
  
  /**
   * 隐藏登录弹窗
   */
  hideLoginModal: function() {
    this.setData({
      showLoginModal: false
    });
  },
  
  /**
   * 切换登录/注册模式
   */
  switchLoginMode: function() {
    this.setData({
      isRegisterMode: !this.data.isRegisterMode,
      loginForm: {
        username: '',
        password: '',
        confirmPassword: ''
      }
    });
  },
  
  /**
   * 监听用户名输入
   */
  onUsernameInput: function(e) {
    this.setData({
      'loginForm.username': e.detail.value
    });
  },
  
  /**
   * 监听密码输入
   */
  onPasswordInput: function(e) {
    this.setData({
      'loginForm.password': e.detail.value
    });
  },
  
  /**
   * 监听确认密码输入
   */
  onConfirmPasswordInput: function(e) {
    this.setData({
      'loginForm.confirmPassword': e.detail.value
    });
  },
  
  /**
   * 登录
   */
  login: function() {
    const { username, password } = this.data.loginForm;
    
    if (!username || !password) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    // 从存储中获取用户信息验证登录
    const users = wx.getStorageSync('users') || [];
    console.log('当前所有用户:', users); // 调试用
    
    // 特别检查管理员账号
    if (username === 'lifeihong' && password === 'lfh123456') {
      console.log('尝试管理员登录');
      
      // 检查管理员账号是否存在
      const adminUser = users.find(u => u.username === 'lifeihong');
      
      if (!adminUser) {
        // 如果不存在，创建管理员账号
        const newAdminUser = {
          userId: 'admin_' + Date.now(),
          username: 'lifeihong',
          password: 'lfh123456',
          nickName: '管理员',
          avatarUrl: '/images/default-avatar.png',
          createTime: new Date().toISOString(),
          isAdmin: true
        };
        
        users.push(newAdminUser);
        wx.setStorageSync('users', users);
        
        // 自动登录
        this.setData({
          isLoggedIn: true,
          userInfo: newAdminUser,
          showLoginModal: false
        });
        
        // 保存登录状态
        wx.setStorageSync('userInfo', newAdminUser);
        
        wx.showToast({
          title: '管理员登录成功',
          icon: 'success'
        });
        return;
      }
    }
    
    // 原有登录逻辑
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      // 登录成功
      this.setData({
        isLoggedIn: true,
        userInfo: user,
        showLoginModal: false
      });
      
      // 保存登录状态
      wx.setStorageSync('userInfo', user);
      
      // 如果是管理员，获取统计信息
      if (user.isAdmin) {
        this.getAdminStats();
      } else {
        // 获取玩家积分
        this.getPlayerScore();
      }
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '用户名或密码错误',
        icon: 'none'
      });
    }
  },
  
  /**
   * 注册
   */
  register: function() {
    const { username, password, confirmPassword } = this.data.loginForm;
    
    if (!username || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }
    
    // 从存储中获取现有用户
    const users = wx.getStorageSync('users') || [];
    
    // 检查用户名是否已存在
    if (users.some(u => u.username === username)) {
      wx.showToast({
        title: '用户名已存在',
        icon: 'none'
      });
      return;
    }
    
    // 创建新用户
    const newUser = {
      userId: Date.now().toString(),
      username: username,
      password: password,
      nickName: username,
      avatarUrl: '/images/default-avatar.png',
      createTime: new Date().toISOString()
    };
    
    // 保存用户信息
    users.push(newUser);
    wx.setStorageSync('users', users);
    
    // 自动登录
    this.setData({
      isLoggedIn: true,
      userInfo: newUser,
      showLoginModal: false
    });
    
    // 保存登录状态
    wx.setStorageSync('userInfo', newUser);
    
    wx.showToast({
      title: '注册并登录成功',
      icon: 'success'
    });
  },
  
  /**
   * 选择性别
   */
  selectGender: function(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'playerForm.gender': gender
    });
  },
  
  /**
   * 显示注册选手弹窗
   */
  showRegisterPlayerModal: function() {
    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      this.showLoginModal();
      return;
    }
    
    // 先关闭操作菜单，再显示注册选手弹窗
    this.setData({
      showActionMenu: false,  // 关键修改：先关闭操作菜单
      showRegisterPlayerModal: true,
      playerForm: {
        name: '',
        avatarUrl: '',
        gender: 'male'  // 默认性别为男
      }
    });
  },
  
  /**
   * 隐藏注册选手弹窗
   */
  hideRegisterPlayerModal: function() {
    this.setData({
      showRegisterPlayerModal: false
    });
  },
  
  /**
   * 监听选手姓名输入
   */
  onPlayerNameInput: function(e) {
    this.setData({
      'playerForm.name': e.detail.value
    });
  },
  
  /**
   * 选择头像
   */
  chooseAvatar: function() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that.setData({
          'playerForm.avatarUrl': res.tempFilePaths[0]
        });
      }
    });
  },
  
  /**
   * 保存选手信息（支持普通用户注册和管理员创建/更新）
   */
  savePlayerInfo: function() {
    const name = this.data.playerForm.name;
    const gender = this.data.playerForm.gender;
    
    if (!name) {
      wx.showToast({
        title: '请填写选手姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!gender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      });
      return;
    }
    
    // 从全局数据获取现有选手
    let allPlayers = app.globalData.players || [];
    const userInfo = this.data.userInfo;
    const editingPlayerId = this.data.editingPlayerId;
    
    // 设置默认头像
    const defaultAvatarUrl = gender === 'female' ? '/images/default-avatar-female.png' : '/images/default-avatar.png';
    
    // 检查是否存在之前删除的同名选手
    const deletedPlayers = wx.getStorageSync('deletedPlayers') || {};
    const deletedPlayerData = deletedPlayers[name];
    
    // 管理员操作
    if (userInfo.isAdmin) {
      if (editingPlayerId) {
        // 管理员更新选手
        const playerIndex = allPlayers.findIndex(p => p.id === editingPlayerId);
        
        if (playerIndex !== -1) {
          // 检查名字是否与其他选手冲突
          const nameConflict = allPlayers.some(p => 
            p.name === name && 
            p.id !== editingPlayerId
          );
          
          if (nameConflict) {
            wx.showToast({
              title: '该选手名字已被使用',
              icon: 'none'
            });
            return;
          }
          
          // 更新选手信息
          allPlayers[playerIndex].name = name;
          allPlayers[playerIndex].gender = gender;
          
          // 如果是女性且使用默认头像，更新头像
          if (gender === 'female' && 
              (!allPlayers[playerIndex].avatarUrl || allPlayers[playerIndex].avatarUrl === '/images/default-avatar.png')) {
            allPlayers[playerIndex].avatarUrl = defaultAvatarUrl;
          } else if (gender === 'male' && 
                    (!allPlayers[playerIndex].avatarUrl || allPlayers[playerIndex].avatarUrl === '/images/default-avatar-female.png')) {
            allPlayers[playerIndex].avatarUrl = '/images/default-avatar.png';
          }
          
          // 关键：保存到全局变量和本地存储
          app.globalData.players = allPlayers;
          wx.setStorageSync('players', allPlayers);
          
          this.setData({
            playersList: allPlayers,
            showRegisterPlayerModal: false
          });
          
          // 重新获取玩家信息以刷新胜率
          this.getPlayerInfo();
          
          wx.showToast({
            title: '选手信息已更新',
            icon: 'success'
          });
        }
      } else {
        // 管理员创建新选手
        // 检查名字是否已存在
        if (allPlayers.some(p => p.name === name)) {
          wx.showToast({
            title: '该选手名字已被使用',
            icon: 'none'
          });
          return;
        }
        
        // 创建新选手（无userId关联）
        let newPlayer;
        
        if (deletedPlayerData) {
          // 如果存在被删除的同名选手，恢复其数据
          newPlayer = {
            id: deletedPlayerData.id, // 使用原来的ID以关联历史记录
            name: name,
            gender: gender,
            avatarUrl: defaultAvatarUrl,
            score: deletedPlayerData.score || 1000,
            wins: deletedPlayerData.wins || 0,
            losses: deletedPlayerData.losses || 0
          };
          
          // 从删除列表中移除
          delete deletedPlayers[name];
          wx.setStorageSync('deletedPlayers', deletedPlayers);
          
          wx.showToast({
            title: '已恢复选手历史数据',
            icon: 'none',
            duration: 2000
          });
        } else {
          // 创建全新选手
          newPlayer = {
            id: Date.now().toString(),
            name: name,
            gender: gender,
            avatarUrl: defaultAvatarUrl,
            score: 1000,
            wins: 0,
            losses: 0
          };
        }
        
        // 添加到全局数组
        allPlayers.push(newPlayer);
        
        // 保存数据
        app.globalData.players = allPlayers;
        wx.setStorageSync('players', allPlayers);
        
        this.setData({
          playersList: allPlayers,
          showRegisterPlayerModal: false
        });
        
        // 重新获取玩家信息以刷新胜率
        this.getPlayerInfo();
        
        wx.showToast({
          title: '选手创建成功',
          icon: 'success'
        });
      }
      return;
    }
    
    // 普通用户操作
    // 检查选手名字是否已存在（排除自己）
    const nameExists = allPlayers.some(p => 
      p.name === name && 
      p.userId !== userInfo.userId
    );
    
    if (nameExists) {
      wx.showToast({
        title: '该选手名字已被使用',
        icon: 'none'
      });
      return;
    }
    
    // 查找用户现有选手
    const existingPlayerIndex = allPlayers.findIndex(p => p.userId === userInfo.userId);
    
    if (existingPlayerIndex !== -1) {
      // 更新现有选手信息
      allPlayers[existingPlayerIndex].name = name;
      allPlayers[existingPlayerIndex].gender = gender;
      
      // 如果是女性且使用默认头像，更新头像
      if (gender === 'female' && 
          (!allPlayers[existingPlayerIndex].avatarUrl || allPlayers[existingPlayerIndex].avatarUrl === '/images/default-avatar.png')) {
        allPlayers[existingPlayerIndex].avatarUrl = defaultAvatarUrl;
      } else if (gender === 'male' && 
                (!allPlayers[existingPlayerIndex].avatarUrl || allPlayers[existingPlayerIndex].avatarUrl === '/images/default-avatar-female.png')) {
        allPlayers[existingPlayerIndex].avatarUrl = '/images/default-avatar.png';
      }
      
      // 关键：保存到全局变量和本地存储
      app.globalData.players = allPlayers;
      wx.setStorageSync('players', allPlayers);
      
      // 更新本地显示 - 需要重新获取玩家信息以刷新胜率
      this.setData({
        showRegisterPlayerModal: false
      });
      
      // 重新获取玩家信息以刷新胜率
      this.getPlayerInfo();
      
      wx.showToast({
        title: '选手信息已更新',
        icon: 'success'
      });
    } else {
      // 创建新选手
      let newPlayer;
      
      if (deletedPlayerData) {
        // 如果存在被删除的同名选手，恢复其数据
        newPlayer = {
          id: deletedPlayerData.id, // 使用原来的ID以关联历史记录
          userId: userInfo.userId, // 关联到当前用户
          name: name,
          gender: gender,
          avatarUrl: defaultAvatarUrl,
          score: deletedPlayerData.score || 1000,
          wins: deletedPlayerData.wins || 0,
          losses: deletedPlayerData.losses || 0
        };
        
        // 从删除列表中移除
        delete deletedPlayers[name];
        wx.setStorageSync('deletedPlayers', deletedPlayers);
        
        wx.showToast({
          title: '已恢复选手历史数据',
          icon: 'none',
          duration: 2000
        });
      } else {
        // 创建全新选手
        newPlayer = {
          id: Date.now().toString(),
          userId: userInfo.userId,
          name: name,
          gender: gender,
          avatarUrl: defaultAvatarUrl,
          score: 1000,
          wins: 0,
          losses: 0
        };
      }
      
      // 添加到全局数组
      allPlayers.push(newPlayer);
      
      // 关键：保存到全局变量和本地存储
      app.globalData.players = allPlayers;
      wx.setStorageSync('players', allPlayers);
      
      // 更新本地显示 - 需要重新获取玩家信息以刷新胜率
      this.setData({
        showRegisterPlayerModal: false
      });
      
      // 重新获取玩家信息以刷新胜率
      this.getPlayerInfo();
      
      wx.showToast({
        title: '选手注册成功',
        icon: 'success'
      });
    }
  },

  /**
   * 显示用户操作菜单
   */
  showUserActionMenu: function() {
    // 清理任何可能的残留数据
    this.setData({
      showActionMenu: true,
      editingPlayerId: null,
      playerForm: { name: '' }
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation: function(e) {
    // 阻止事件冒泡，防止点击菜单项时触发背景的点击事件
    return;
  },

  /**
   * 退出登录
   */
  logout: function() {
    // 立即显示确认弹窗，不等待其他操作
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        // 在用户操作完成后再关闭菜单
        this.setData({
          showActionMenu: false
        });
        
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('userInfo');
          
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            playerInfo: null
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 编辑选手信息
   */
  editPlayerInfo: function() {
    const playerInfo = this.data.playerInfo;
    
    this.setData({
      playerForm: {
        name: playerInfo.name,
        avatarUrl: playerInfo.avatarUrl,
        gender: playerInfo.gender || 'male' // 如果没有性别信息，默认为男性
      },
      showActionMenu: false,  // 先关闭操作菜单
      showRegisterPlayerModal: true
    });
  },

  /**
   * 隐藏用户操作菜单
   */
  hideActionMenu: function() {
    this.setData({
      showActionMenu: false
    });
  },

  /**
   * 导出数据
   */
  exportData: function() {
    // 检查管理员权限
    if (!this.data.userInfo || !this.data.userInfo.isAdmin) {
      wx.showToast({
        title: '无管理员权限',
        icon: 'none'
      });
      return;
    }
    
    // 重置导出设置
    this.setData({
      exportDataTypes: {
        players: true,
        matchHistory: true
      },
      showExportModal: true
    });
    
    // 生成初始数据
    this.generateExportData();
  },

  /**
   * 切换导出数据类型
   */
  toggleExportDataType: function(e) {
    const type = e.currentTarget.dataset.type;
    const currentValue = this.data.exportDataTypes[type];
    
    this.setData({
      [`exportDataTypes.${type}`]: !currentValue
    });
    
    // 确保至少选择一种数据类型
    if (!this.data.exportDataTypes.players && !this.data.exportDataTypes.matchHistory) {
      wx.showToast({
        title: '请至少选择一种数据类型',
        icon: 'none'
      });
      this.setData({
        [`exportDataTypes.${type}`]: true
      });
      return;
    }
    
    // 重新生成导出数据
    this.generateExportData();
  },

  /**
   * 根据设置生成导出数据
   */
  generateExportData: function() {
    const { exportDataTypes } = this.data;
    
    // 准备导出数据对象
    const dataToExport = {};
    if (exportDataTypes.players) {
      dataToExport.players = wx.getStorageSync('players') || [];
    }
    if (exportDataTypes.matchHistory) {
      dataToExport.matchHistory = wx.getStorageSync('matchHistory') || [];
    }
    dataToExport.exportTime = new Date().toISOString();
    dataToExport.appVersion = '1.0.0';
    
    // 生成JSON格式数据
    const exportData = JSON.stringify(dataToExport, null, 2);
    
    this.setData({
      exportedData: exportData
    });
  },

  /**
   * 复制导出数据
   */
  copyExportData: function() {
    wx.setClipboardData({
      data: this.data.exportedData,
      success: function() {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 显示导入数据对话框
   */
  importData: function() {
    // 检查管理员权限
    if (!this.data.userInfo || !this.data.userInfo.isAdmin) {
      wx.showToast({
        title: '无管理员权限',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      importText: '',
      importDataTypes: {
        players: true,
        matchHistory: true
      },
      showImportModal: true
    });
  },

  /**
   * 切换导入数据类型
   */
  toggleImportDataType: function(e) {
    const type = e.currentTarget.dataset.type;
    const currentValue = this.data.importDataTypes[type];
    
    this.setData({
      [`importDataTypes.${type}`]: !currentValue
    });
    
    // 确保至少选择一种数据类型
    if (!this.data.importDataTypes.players && !this.data.importDataTypes.matchHistory) {
      wx.showToast({
        title: '请至少选择一种数据类型',
        icon: 'none'
      });
      this.setData({
        [`importDataTypes.${type}`]: true
      });
    }
  },

  /**
   * 处理导入文本变化
   */
  onImportTextInput: function(e) {
    this.setData({
      importText: e.detail.value
    });
  },

  /**
   * 确认导入数据
   */
  confirmImport: function() {
    const importText = this.data.importText;
    const { importDataTypes } = this.data;
    
    if (!importText) {
      wx.showToast({
        title: '请输入数据',
        icon: 'none'
      });
      return;
    }
    
    try {
      // 解析JSON数据
      const importData = JSON.parse(importText);
      
      // 数据完整性检查
      if (!importData.players && !importData.matchHistory) {
        throw new Error('数据格式不正确');
      }
      
      // 获取当前数据
      const currentPlayers = wx.getStorageSync('players') || [];
      const currentMatches = wx.getStorageSync('matchHistory') || [];
      
      // 计算要导入的数据数量
      const playerCount = importDataTypes.players && importData.players ? importData.players.length : 0;
      const matchCount = importDataTypes.matchHistory && importData.matchHistory ? importData.matchHistory.length : 0;
      
      // 显示确认对话框
      let confirmMsg = '将导入';
      if (playerCount > 0) confirmMsg += `${playerCount}个选手数据`;
      if (playerCount > 0 && matchCount > 0) confirmMsg += '和';
      if (matchCount > 0) confirmMsg += `${matchCount}条比赛记录`;
      confirmMsg += '，此操作将合并现有数据，确定继续吗？';
      
      wx.showModal({
        title: '确认导入',
        content: confirmMsg,
        success: (res) => {
          if (res.confirm) {
            // 确认导入，执行数据合并
            let updatedPlayers = [...currentPlayers];
            let updatedMatches = [...currentMatches];
            
            if (importDataTypes.players && importData.players) {
              // 创建名字到ID的映射，用于后续关联
              const nameToIdMap = {};
              
              // 特殊处理：先检查是否存在管理员账号的"小飞"选手
              const adminUsers = wx.getStorageSync('users') || [];
              const adminUser = adminUsers.find(u => u.isAdmin && u.username === 'lifeihong');
              const adminUserId = adminUser ? adminUser.userId : null;
              
              let adminPlayerIndex = -1;
              let adminPlayerId = null;
              
              if (adminUserId) {
                // 查找所有名为"小飞"的选手
                const xiaoFeiPlayers = updatedPlayers.filter(p => p.name === '小飞');
                
                // 首先查找绑定到管理员账号的"小飞"
                adminPlayerIndex = updatedPlayers.findIndex(p => p.userId === adminUserId && p.name === '小飞');
                
                // 如果找到了绑定到管理员账号的"小飞"
                if (adminPlayerIndex !== -1) {
                  adminPlayerId = updatedPlayers[adminPlayerIndex].id;
                  
                  // 检查是否有其他名为"小飞"的选手（非管理员绑定）
                  const otherXiaoFeiIndexes = updatedPlayers
                    .map((p, index) => p.name === '小飞' && (p.userId !== adminUserId || !p.userId) ? index : -1)
                    .filter(index => index !== -1);
                  
                  // 如果有其他"小飞"选手，合并它们的数据到管理员的"小飞"
                  if (otherXiaoFeiIndexes.length > 0) {
                    // 从高到低排序索引，以便正确删除
                    otherXiaoFeiIndexes.sort((a, b) => b - a);
                    
                    // 遍历其他"小飞"选手
                    for (const otherIndex of otherXiaoFeiIndexes) {
                      const otherPlayer = updatedPlayers[otherIndex];
                      
                      // 合并数据（保留更高的积分）
                      updatedPlayers[adminPlayerIndex].score = Math.max(
                        updatedPlayers[adminPlayerIndex].score || 1000, 
                        otherPlayer.score || 1000
                      );
                      
                      // 合并胜负记录
                      updatedPlayers[adminPlayerIndex].wins = (updatedPlayers[adminPlayerIndex].wins || 0) + (otherPlayer.wins || 0);
                      updatedPlayers[adminPlayerIndex].losses = (updatedPlayers[adminPlayerIndex].losses || 0) + (otherPlayer.losses || 0);
                      updatedPlayers[adminPlayerIndex].singlesWins = (updatedPlayers[adminPlayerIndex].singlesWins || 0) + (otherPlayer.singlesWins || 0);
                      updatedPlayers[adminPlayerIndex].singlesLosses = (updatedPlayers[adminPlayerIndex].singlesLosses || 0) + (otherPlayer.singlesLosses || 0);
                      updatedPlayers[adminPlayerIndex].doublesWins = (updatedPlayers[adminPlayerIndex].doublesWins || 0) + (otherPlayer.doublesWins || 0);
                      updatedPlayers[adminPlayerIndex].doublesLosses = (updatedPlayers[adminPlayerIndex].doublesLosses || 0) + (otherPlayer.doublesLosses || 0);
                      
                      // 记录ID映射，用于更新比赛记录
                      nameToIdMap[otherPlayer.id] = adminPlayerId;
                      
                      // 从数组中删除这个多余的"小飞"
                      updatedPlayers.splice(otherIndex, 1);
                      
                      // 由于删除了一个元素，管理员"小飞"的索引可能需要调整
                      if (otherIndex < adminPlayerIndex) {
                        adminPlayerIndex--;
                      }
                    }
                    
                    console.log('已合并多个"小飞"选手数据到管理员账号');
                  }
                } else {
                  // 如果没有绑定到管理员账号的"小飞"，但有其他"小飞"选手
                  if (xiaoFeiPlayers.length > 0) {
                    // 找到积分最高的"小飞"
                    const bestXiaoFei = xiaoFeiPlayers.reduce((best, current) => 
                      (current.score || 1000) > (best.score || 1000) ? current : best, xiaoFeiPlayers[0]);
                    
                    // 将这个"小飞"绑定到管理员账号
                    bestXiaoFei.userId = adminUserId;
                    adminPlayerId = bestXiaoFei.id;
                    adminPlayerIndex = updatedPlayers.findIndex(p => p.id === bestXiaoFei.id);
                    
                    // 合并其他"小飞"的数据
                    xiaoFeiPlayers.forEach(player => {
                      if (player.id !== bestXiaoFei.id) {
                        // 合并数据
                        bestXiaoFei.wins = (bestXiaoFei.wins || 0) + (player.wins || 0);
                        bestXiaoFei.losses = (bestXiaoFei.losses || 0) + (player.losses || 0);
                        bestXiaoFei.singlesWins = (bestXiaoFei.singlesWins || 0) + (player.singlesWins || 0);
                        bestXiaoFei.singlesLosses = (bestXiaoFei.singlesLosses || 0) + (player.singlesLosses || 0);
                        bestXiaoFei.doublesWins = (bestXiaoFei.doublesWins || 0) + (player.doublesWins || 0);
                        bestXiaoFei.doublesLosses = (bestXiaoFei.doublesLosses || 0) + (player.doublesLosses || 0);
                        
                        // 记录ID映射
                        nameToIdMap[player.id] = bestXiaoFei.id;
                        
                        // 从数组中删除这个多余的"小飞"
                        const index = updatedPlayers.findIndex(p => p.id === player.id);
                        if (index !== -1) {
                          updatedPlayers.splice(index, 1);
                        }
                      }
                    });
                    
                    console.log('已将最佳"小飞"选手绑定到管理员账号并合并其他"小飞"数据');
                  } else {
                    // 如果没有任何"小飞"选手，创建一个新的并绑定到管理员账号
                    const newXiaoFei = {
                      id: Date.now().toString(),
                      userId: adminUserId,
                      name: '小飞',
                      gender: 'male',
                      avatarUrl: '/images/default-avatar.png',
                      score: 1000,
                      wins: 0,
                      losses: 0
                    };
                    
                    updatedPlayers.push(newXiaoFei);
                    adminPlayerId = newXiaoFei.id;
                    adminPlayerIndex = updatedPlayers.length - 1;
                    
                    console.log('已创建新的"小飞"选手并绑定到管理员账号');
                  }
                }
              }
              
              // 特殊处理：检查导入数据中是否有"小飞"选手
              const importXiaoFeiIndex = importData.players.findIndex(p => p.name === '小飞');
              
              // 如果两边都有"小飞"选手，需要特殊合并
              if (adminPlayerIndex !== -1 && importXiaoFeiIndex !== -1) {
                const importXiaoFei = importData.players[importXiaoFeiIndex];
                
                // 记录导入的"小飞"选手ID，用于后续关联
                nameToIdMap[importXiaoFei.id] = adminPlayerId;
                
                // 保留更高的积分
                const currentScore = updatedPlayers[adminPlayerIndex].score || 1000;
                const importScore = importXiaoFei.score || 1000;
                const finalScore = Math.max(currentScore, importScore);
                
                // 合并胜负记录
                const wins = (updatedPlayers[adminPlayerIndex].wins || 0) + (importXiaoFei.wins || 0);
                const losses = (updatedPlayers[adminPlayerIndex].losses || 0) + (importXiaoFei.losses || 0);
                
                // 更新管理员的"小飞"选手信息
                updatedPlayers[adminPlayerIndex] = {
                  ...updatedPlayers[adminPlayerIndex],
                  score: finalScore,
                  wins: wins,
                  losses: losses,
                  // 保留其他可能有用的字段
                  singlesWins: (updatedPlayers[adminPlayerIndex].singlesWins || 0) + (importXiaoFei.singlesWins || 0),
                  singlesLosses: (updatedPlayers[adminPlayerIndex].singlesLosses || 0) + (importXiaoFei.singlesLosses || 0),
                  doublesWins: (updatedPlayers[adminPlayerIndex].doublesWins || 0) + (importXiaoFei.doublesWins || 0),
                  doublesLosses: (updatedPlayers[adminPlayerIndex].doublesLosses || 0) + (importXiaoFei.doublesLosses || 0)
                };
                
                // 从导入列表中移除"小飞"选手，避免重复处理
                importData.players.splice(importXiaoFeiIndex, 1);
              }
              
              // 合并选手数据，根据名字关联
              importData.players.forEach(importPlayer => {
                // 查找是否有同名选手
                const existingPlayerIndex = updatedPlayers.findIndex(p => p.name === importPlayer.name);
                
                if (existingPlayerIndex !== -1) {
                  // 如果存在同名选手，保留原有ID，但更新其他信息
                  const existingId = updatedPlayers[existingPlayerIndex].id;
                  nameToIdMap[importPlayer.id] = existingId;
                  
                  // 保留更高的积分
                  const existingScore = updatedPlayers[existingPlayerIndex].score || 1000;
                  const importScore = importPlayer.score || 1000;
                  const finalScore = Math.max(existingScore, importScore);
                  
                  // 合并胜负记录
                  const wins = (updatedPlayers[existingPlayerIndex].wins || 0) + (importPlayer.wins || 0);
                  const losses = (updatedPlayers[existingPlayerIndex].losses || 0) + (importPlayer.losses || 0);
                  
                  // 更新选手信息
                  updatedPlayers[existingPlayerIndex] = {
                    ...updatedPlayers[existingPlayerIndex],
                    ...importPlayer,
                    id: existingId,
                    score: finalScore,
                    wins: wins,
                    losses: losses
                  };
                } else {
                  // 如果不存在同名选手，添加为新选手
                  updatedPlayers.push(importPlayer);
                  nameToIdMap[importPlayer.id] = importPlayer.id;
                }
              });
              
              // 如果同时导入比赛历史，需要更新比赛历史中的选手ID
              if (importDataTypes.matchHistory && importData.matchHistory) {
                importData.matchHistory.forEach(match => {
                  // 更新左队选手ID
                  if (match.leftTeam) {
                    match.leftTeam.forEach(player => {
                      if (nameToIdMap[player.id]) {
                        player.id = nameToIdMap[player.id];
                      }
                    });
                  }
                  
                  // 更新右队选手ID
                  if (match.rightTeam) {
                    match.rightTeam.forEach(player => {
                      if (nameToIdMap[player.id]) {
                        player.id = nameToIdMap[player.id];
                      }
                    });
                  }
                });
              }
            }
            
            if (importDataTypes.matchHistory && importData.matchHistory) {
              // 合并比赛历史，避免重复
              const existingMatchIds = new Set(updatedMatches.map(m => m.id));
              
              importData.matchHistory.forEach(match => {
                if (!existingMatchIds.has(match.id)) {
                  updatedMatches.push(match);
                }
              });
            }
            
            // 保存数据
            wx.setStorageSync('players', updatedPlayers);
            wx.setStorageSync('matchHistory', updatedMatches);
            
            // 更新全局数据
            app.globalData.players = updatedPlayers;
            app.globalData.matchHistory = updatedMatches;
            
            this.setData({
              showImportModal: false
            });
            
            // 更新管理员统计信息
            this.getAdminStats();
            
            wx.showToast({
              title: '数据导入成功',
              icon: 'success'
            });
          }
        }
      });
    } catch (error) {
      wx.showToast({
        title: '数据格式错误: ' + error.message,
        icon: 'none'
      });
    }
  },

  /**
   * 隐藏导出模态窗口
   */
  hideExportModal: function() {
    this.setData({
      showExportModal: false
    });
  },

  /**
   * 隐藏导入模态窗口
   */
  hideImportModal: function() {
    this.setData({
      showImportModal: false
    });
  },

  /**
   * 创建新选手（管理员功能）
   */
  createNewPlayer: function() {
    // 先关闭选手列表弹窗，再显示创建选手弹窗
    this.setData({
      showPlayersListModal: false, // 先关闭管理选手弹窗
      editingPlayerId: null,
      playerForm: {
        name: '', // 清空表单内容
        gender: 'male' // 明确设置默认性别为男性
      },
      showRegisterPlayerModal: true
    });
  },

  /**
   * 管理员功能：显示所有选手
   */
  manageAllPlayers: function() {
    // 重置批量选择状态
    this.setData({
      batchSelectPlayers: false,
      selectedPlayerIds: [],
      allPlayersSelected: false,
      playerSearchText: ''
    });
    
    // 从存储中获取最新数据，而不是全局变量
    const allPlayers = wx.getStorageSync('players') || [];
    app.globalData.players = allPlayers; // 更新全局数据
    
    this.setData({
      playersList: allPlayers,
      filteredPlayersList: allPlayers,
      showPlayersListModal: true
    });
  },
  
  /**
   * 管理员功能：合并"小飞"选手数据
   */
  mergeXiaoFeiPlayer: function() {
    wx.showModal({
      title: '合并"小飞"选手数据',
      content: '确定要合并所有"小飞"选手的数据吗？这将把所有同名选手的积分和历史记录合并到管理员的"小飞"选手下。',
      success: (res) => {
        if (res.confirm) {
          // 调用 app.js 中的合并函数
          const result = app.mergeDuplicatePlayer('小飞');
          
          if (result) {
            wx.showToast({
              title: '合并成功',
              icon: 'success'
            });
            
            // 刷新统计数据
            this.getAdminStats();
          } else {
            wx.showToast({
              title: '没有找到需要合并的选手',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  /**
   * 隐藏选手列表管理弹窗
   */
  hidePlayersListModal: function() {
    this.setData({
      showPlayersListModal: false,
      // 重置批量操作状态
      batchSelectPlayers: false,
      selectedPlayerIds: [],
      allPlayersSelected: false,
      playerSearchText: ''
    });
    
    // 刷新玩家信息
    if (!this.data.userInfo.isAdmin) {
      this.getPlayerInfo();
    }
  },

  /**
   * 编辑选手
   */
  editPlayer: function(e) {
    const playerId = e.currentTarget.dataset.id;
    const allPlayers = app.globalData.players || [];
    const player = allPlayers.find(p => p.id === playerId);
    
    if (player) {
      this.setData({
        editingPlayerId: playerId,
        playerForm: {
          name: player.name,
          gender: player.gender || 'male', // 设置为选手原有的性别，如果没有则默认为男性
          avatarUrl: player.avatarUrl
        },
        showPlayersListModal: false,
        showRegisterPlayerModal: true
      });
    } else {
      // 选手不存在，显示错误提示
      wx.showToast({
        title: '选手不存在',
        icon: 'none'
      });
    }
  },

  /**
   * 删除选手
   */
  deletePlayer: function(e) {
    const playerId = e.currentTarget.dataset.id;
    const allPlayers = app.globalData.players || [];
    const playerIndex = allPlayers.findIndex(p => p.id === playerId);
    
    if (playerIndex !== -1) {
      const playerName = allPlayers[playerIndex].name;
      const playerData = allPlayers[playerIndex];
      
      wx.showModal({
        title: '确认删除',
        content: `确定要删除选手"${playerName}"吗？此操作不会删除历史记录，重新注册相同名字的选手将保留积分和历史记录。`,
        success: (res) => {
          if (res.confirm) {
            // 保存删除的选手信息到deletedPlayers存储中，以便后续恢复
            const deletedPlayers = wx.getStorageSync('deletedPlayers') || {};
            deletedPlayers[playerName] = {
              id: playerData.id,
              score: playerData.score,
              wins: playerData.wins,
              losses: playerData.losses,
              gender: playerData.gender,
              deleteTime: new Date().toISOString()
            };
            wx.setStorageSync('deletedPlayers', deletedPlayers);
            
            // 删除选手
            allPlayers.splice(playerIndex, 1);
            app.globalData.players = allPlayers;
            wx.setStorageSync('players', allPlayers);
            
            // 更新列表和筛选后的列表
            const currentSearch = this.data.playerSearchText;
            
            if (currentSearch) {
              // 如果有搜索文本，重新应用筛选
              const filtered = allPlayers.filter(player => {
                return player.name.toLowerCase().includes(currentSearch.toLowerCase());
              });
              
              this.setData({
                playersList: allPlayers,
                filteredPlayersList: filtered
              });
            } else {
              // 如果没有搜索文本，两个列表保持一致
              this.setData({
                playersList: allPlayers,
                filteredPlayersList: allPlayers
              });
            }
            
            // 更新管理员统计信息
            this.getAdminStats();
            
            wx.showToast({
              title: '选手已删除',
              icon: 'success'
            });
          }
        }
      });
    }
  },

  /**
   * 获取管理员统计信息
   */
  getAdminStats: function() {
    // 确保从存储中获取最新数据
    const allPlayers = wx.getStorageSync('players') || [];
    const matchHistory = wx.getStorageSync('matchHistory') || [];
    
    // 更新全局数据
    app.globalData.players = allPlayers;
    app.globalData.matchHistory = matchHistory;
    
    this.setData({
      adminStats: {
        totalPlayers: allPlayers.length,
        totalMatches: matchHistory.length
      }
    });
  },

  /**
   * 管理历史记录
   */
  manageMatchHistory: function() {
    this.loadMatchHistory();
    
    this.setData({
      showHistoryListModal: true,
      // 重置批量操作状态
      batchSelectHistory: false,
      selectedHistoryIds: [],
      allHistorySelected: false
    });
  },
  
  /**
   * 隐藏历史记录管理弹窗
   */
  hideHistoryListModal: function() {
    this.setData({
      showHistoryListModal: false,
      // 重置批量操作状态
      batchSelectHistory: false,
      selectedHistoryIds: [],
      allHistorySelected: false,
      historySearchText: ''
    });
    
    // 刷新玩家信息
    if (!this.data.userInfo.isAdmin) {
      this.getPlayerInfo();
    }
  },

  /**
   * 加载所有历史记录
   */
  loadMatchHistory: function() {
    // 从存储中获取历史记录
    const allHistory = wx.getStorageSync('matchHistory') || [];
    app.globalData.matchHistory = allHistory; // 确保全局数据是最新的
    
    console.log('加载历史记录', allHistory.length, '条');
    
    // 格式化日期和分数，添加团队名称
    const formattedHistory = allHistory.map(match => {
      let displayDate = '无日期';
      
      try {
        // 统一使用 date 字段，这与历史页面保持一致
        if (match.date) {
          const matchDate = new Date(match.date);
          
          // 检查日期是否有效
          if (!isNaN(matchDate.getTime())) {
            displayDate = `${matchDate.getFullYear()}-${this.padZero(matchDate.getMonth() + 1)}-${this.padZero(matchDate.getDate())} ${this.padZero(matchDate.getHours())}:${this.padZero(matchDate.getMinutes())}`;
          } else {
            console.warn('无法解析日期:', match.date);
          }
        }
      } catch (error) {
        console.error('日期格式化错误:', error, match);
      }
      
      // 格式化团队名称
      const leftTeamNames = match.leftTeam && match.leftTeam.length > 0 ? 
                            match.leftTeam.map(p => p.name || '未知').join(' & ') : 
                            '未知';
      const rightTeamNames = match.rightTeam && match.rightTeam.length > 0 ? 
                             match.rightTeam.map(p => p.name || '未知').join(' & ') : 
                             '未知';
      
      // 添加分数结果
      const scoreResult = `${match.leftScore || 0}:${match.rightScore || 0}`;
      
      return {
        ...match,
        displayDate,
        leftTeamNames,
        rightTeamNames,
        scoreResult
      };
    });
    
    this.setData({
      matchHistoryList: formattedHistory,
      filteredHistoryList: formattedHistory
    });
  },

  /**
   * 日期时间补零
   */
  padZero: function(num) {
    return num < 10 ? '0' + num : num;
  },

  /**
   * 编辑历史记录
   */
  editMatchHistory: function(e) {
    const matchId = e.currentTarget.dataset.id;
    const matchHistory = app.globalData.matchHistory || [];
    const matchIndex = matchHistory.findIndex(m => m.id === matchId);
    
    if (matchIndex !== -1) {
      const match = matchHistory[matchIndex];
      const allPlayers = app.globalData.players || [];
      
      // 格式化队伍名称
      const leftTeamNames = match.leftTeam.map(player => {
        const playerInfo = allPlayers.find(p => p.id === player.id) || player;
        return playerInfo.name;
      }).join(' + ');
      
      const rightTeamNames = match.rightTeam.map(player => {
        const playerInfo = allPlayers.find(p => p.id === player.id) || player;
        return playerInfo.name;
      }).join(' + ');
      
      this.setData({
        editingHistoryId: matchId,
        editingHistory: {
          leftScore: match.leftScore,
          rightScore: match.rightScore,
          leftTeamNames: leftTeamNames,
          rightTeamNames: rightTeamNames,
          originalMatch: match // 保存原始比赛数据
        },
        showEditHistoryModal: true
      });
    } else {
      wx.showToast({
        title: '未找到记录',
        icon: 'none'
      });
    }
  },
  
  /**
   * 隐藏历史记录编辑弹窗
   */
  hideEditHistoryModal: function() {
    this.setData({
      showEditHistoryModal: false
    });
  },
  
  /**
   * 监听左侧分数输入
   */
  onLeftScoreInput: function(e) {
    this.setData({
      'editingHistory.leftScore': parseInt(e.detail.value) || 0
    });
  },
  
  /**
   * 监听右侧分数输入
   */
  onRightScoreInput: function(e) {
    this.setData({
      'editingHistory.rightScore': parseInt(e.detail.value) || 0
    });
  },
  
  /**
   * 确认编辑历史记录
   */
  confirmEditHistory: function() {
    const { editingHistoryId, editingHistory } = this.data;
    
    // 验证输入
    if (!editingHistory.leftScore && editingHistory.leftScore !== 0) {
      wx.showToast({
        title: '请输入左方分数',
        icon: 'none'
      });
      return;
    }
    
    if (!editingHistory.rightScore && editingHistory.rightScore !== 0) {
      wx.showToast({
        title: '请输入右方分数',
        icon: 'none'
      });
      return;
    }
    
    // 验证分数合法性
    if (editingHistory.leftScore < 0 || editingHistory.rightScore < 0) {
      wx.showToast({
        title: '分数不能为负',
        icon: 'none'
      });
      return;
    }
    
    // 确认比分不能相同
    if (editingHistory.leftScore === editingHistory.rightScore) {
      wx.showToast({
        title: '比分不能相同',
        icon: 'none'
      });
      return;
    }
    
    // 获取所有比赛记录
    const matchHistory = wx.getStorageSync('matchHistory') || [];
    const matchIndex = matchHistory.findIndex(m => m.id === editingHistoryId);
    
    if (matchIndex === -1) {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      return;
    }
    
    // 获取原始比赛记录
    const originalMatch = editingHistory.originalMatch;
    
    // 检查比分是否真的改变了
    if (originalMatch.leftScore === editingHistory.leftScore && 
        originalMatch.rightScore === editingHistory.rightScore) {
      // 比分没有改变，直接关闭弹窗
      this.setData({
        showEditHistoryModal: false
      });
      
      wx.showToast({
        title: '比分未改变',
        icon: 'none'
      });
      return;
    }
    
    // 准备更新的比赛数据
    const updatedMatch = {
      ...originalMatch,
      leftScore: editingHistory.leftScore,
      rightScore: editingHistory.rightScore
    };
    
    // 判断胜负是否改变
    const originalLeftWin = originalMatch.leftScore > originalMatch.rightScore;
    const updatedLeftWin = editingHistory.leftScore > editingHistory.rightScore;
    
    if (originalLeftWin !== updatedLeftWin) {
      // 胜负改变，需要重新计算ELO积分
      wx.showModal({
        title: '提示',
        content: '修改会导致胜负结果改变，积分将重新计算，确定继续吗？',
        success: (res) => {
          if (res.confirm) {
            this.processMatchUpdate(matchIndex, updatedMatch);
          }
        }
      });
    } else {
      // 胜负未改变，但比分改变，也需要重新计算ELO积分
      this.processMatchUpdate(matchIndex, updatedMatch);
    }
  },
  
  /**
   * 处理比赛记录更新
   */
  processMatchUpdate: function(matchIndex, updatedMatch) {
    // 获取数据
    const matchHistory = wx.getStorageSync('matchHistory') || [];
    const allPlayers = wx.getStorageSync('players') || [];
    
    // 获取原始比赛记录
    const originalMatch = matchHistory[matchIndex];
    
    // 获取比赛中涉及的选手
    const leftTeam = originalMatch.leftTeam;
    const rightTeam = originalMatch.rightTeam;
    
    // 确定原始胜负情况
    const originalLeftWin = originalMatch.leftScore > originalMatch.rightScore;
    const originalWinnerTeam = originalLeftWin ? leftTeam : rightTeam;
    const originalLoserTeam = originalLeftWin ? rightTeam : leftTeam;
    
    // 1. 撤销原有积分变化
    // 对于胜利方，减去原来的胜利加分，减少胜场
    originalWinnerTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 减去原来的积分变化
        allPlayers[index].score -= (originalMatch.winnerChange || 0);
        // 减少胜场
        allPlayers[index].wins = Math.max(0, (allPlayers[index].wins || 0) - 1);
        
        // 更新单打/双打胜负统计
        if (originalWinnerTeam.length === 1) {
          allPlayers[index].singlesWins = Math.max(0, (allPlayers[index].singlesWins || 0) - 1);
        } else {
          allPlayers[index].doublesWins = Math.max(0, (allPlayers[index].doublesWins || 0) - 1);
        }
      }
    });
    
    // 对于失败方，减去原来的失败减分，减少负场
    originalLoserTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 减去原来的积分变化（负值）
        allPlayers[index].score -= (originalMatch.loserChange || 0);
        // 减少负场
        allPlayers[index].losses = Math.max(0, (allPlayers[index].losses || 0) - 1);
        
        // 更新单打/双打胜负统计
        if (originalLoserTeam.length === 1) {
          allPlayers[index].singlesLosses = Math.max(0, (allPlayers[index].singlesLosses || 0) - 1);
        } else {
          allPlayers[index].doublesLosses = Math.max(0, (allPlayers[index].doublesLosses || 0) - 1);
        }
      }
    });
    
    // 2. 确定新的胜负情况
    const newLeftWin = updatedMatch.leftScore > updatedMatch.rightScore;
    const newWinnerTeam = newLeftWin ? leftTeam : rightTeam;
    const newLoserTeam = newLeftWin ? rightTeam : leftTeam;
    const winnerScore = newLeftWin ? updatedMatch.leftScore : updatedMatch.rightScore;
    const loserScore = newLeftWin ? updatedMatch.rightScore : updatedMatch.leftScore;
    
    // 3. 计算比分差距
    const scoreDiff = winnerScore - loserScore;
    
    // 4. 计算队伍平均分
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
    
    const winnerAvgRating = getTeamAverageRating(newWinnerTeam);
    const loserAvgRating = getTeamAverageRating(newLoserTeam);
    
    // 5. 计算积分变化，考虑比分差距
    const { winnerChange, loserChange } = app.calculateEloRating(winnerAvgRating, loserAvgRating, scoreDiff);
    
    // 6. 更新比赛记录的胜负方
    updatedMatch.winner = newLeftWin ? 'left' : 'right';
    
    // 7. 应用新的积分变化
    // 对于胜利方，增加新的胜利加分，增加胜场
    let finalWinnerChange = winnerChange; // 最终应用的胜利方积分变化
    
    newWinnerTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 获取当前选手分数
        const currentScore = allPlayers[index].score || 1000;
        
        // 根据选手分数区间调整加分倍率
        let adjustedWinnerChange = winnerChange;
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
        
        // 更新最终胜利方积分变化（用于记录）
        finalWinnerChange = adjustedWinnerChange;
        
        // 计算新分数并应用上下限
        let newScore = currentScore + adjustedWinnerChange;
        newScore = Math.min(10000, Math.max(500, newScore)); // 应用上限10000和下限500
        
        // 更新选手分数和胜场
        allPlayers[index].score = newScore;
        allPlayers[index].wins = (allPlayers[index].wins || 0) + 1;
        
        // 更新单打/双打胜负统计
        if (newWinnerTeam.length === 1) {
          allPlayers[index].singlesWins = (allPlayers[index].singlesWins || 0) + 1;
        } else {
          allPlayers[index].doublesWins = (allPlayers[index].doublesWins || 0) + 1;
        }
      }
    });
    
    // 更新比赛记录中的实际积分变化值
    updatedMatch.winnerChange = finalWinnerChange;
    updatedMatch.loserChange = loserChange;
    
    // 对于失败方，增加新的失败减分，增加负场
    newLoserTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 计算新分数并应用上下限
        let newScore = (allPlayers[index].score || 1000) + loserChange;
        newScore = Math.min(10000, Math.max(500, newScore)); // 应用上限10000和下限500
        
        // 更新选手分数和负场
        allPlayers[index].score = newScore;
        allPlayers[index].losses = (allPlayers[index].losses || 0) + 1;
        
        // 更新单打/双打胜负统计
        if (newLoserTeam.length === 1) {
          allPlayers[index].singlesLosses = (allPlayers[index].singlesLosses || 0) + 1;
        } else {
          allPlayers[index].doublesLosses = (allPlayers[index].doublesLosses || 0) + 1;
        }
      }
    });
    
    // 更新比赛记录
    matchHistory[matchIndex] = updatedMatch;
    
    // 保存数据
    wx.setStorageSync('matchHistory', matchHistory);
    wx.setStorageSync('players', allPlayers);
    app.globalData.matchHistory = matchHistory;
    app.globalData.players = allPlayers;
    
    // 刷新管理员统计信息
    this.getAdminStats();
    
    // 刷新历史记录列表
    this.loadMatchHistory();
    
    // 刷新玩家信息和胜率数据
    if (!this.data.userInfo.isAdmin) {
      this.getPlayerInfo();
    } else {
      // 管理员也需要刷新普通用户的胜率数据
      this.getPlayerInfo();
    }
    
    // 关闭编辑弹窗
    this.setData({
      showEditHistoryModal: false
    });
    
    wx.showToast({
      title: '更新成功',
      icon: 'success'
    });
  },

  /**
   * 获取所有选手
   */
  getAllPlayers: function() {
    // 重置批量选择状态
    this.setData({
      batchSelectPlayers: false,
      selectedPlayerIds: [],
      allPlayersSelected: false,
      playerSearchText: ''
    });
    
    // 从全局数据和存储中获取所有选手
    const allPlayers = app.globalData.players || wx.getStorageSync('players') || [];
    app.globalData.players = allPlayers; // 确保全局数据是最新的
    
    this.setData({
      playersList: allPlayers,
      filteredPlayersList: allPlayers,
      showPlayersListModal: true
    });
  },

  /**
   * 切换批量选择选手模式
   */
  toggleBatchSelectPlayers: function() {
    // 切换批量选择模式
    const newMode = !this.data.batchSelectPlayers;
    
    this.setData({
      batchSelectPlayers: newMode,
      selectedPlayerIds: [], // 清空已选择的ID
      allPlayersSelected: false
    });
  },
  
  /**
   * 切换全选/取消全选所有选手
   */
  toggleSelectAllPlayers: function() {
    const currentState = this.data.allPlayersSelected;
    const allPlayers = this.data.playersList;
    
    if (currentState) {
      // 取消全选
      this.setData({
        selectedPlayerIds: [],
        allPlayersSelected: false
      });
    } else {
      // 全选所有选手
      const allIds = allPlayers.map(player => player.id);
      this.setData({
        selectedPlayerIds: allIds,
        allPlayersSelected: true
      });
    }
  },
  
  /**
   * 切换单个选手的选择状态
   */
  togglePlayerSelection: function(e) {
    const playerId = e.currentTarget.dataset.id;
    const selectedIds = [...this.data.selectedPlayerIds];
    const index = selectedIds.indexOf(playerId);
    
    if (index !== -1) {
      // 已选中，取消选择
      selectedIds.splice(index, 1);
    } else {
      // 未选中，添加选择
      selectedIds.push(playerId);
    }
    
    // 检查是否全选
    const allPlayersSelected = selectedIds.length === this.data.playersList.length;
    
    this.setData({
      selectedPlayerIds: selectedIds,
      allPlayersSelected
    });
  },
  
  /**
   * 批量删除选手
   */
  batchDeletePlayers: function() {
    const selectedIds = this.data.selectedPlayerIds;
    
    if (selectedIds.length === 0) {
      wx.showToast({
        title: '请先选择选手',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedIds.length} 名选手吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          // 获取当前所有选手
          const allPlayers = app.globalData.players || [];
          // 过滤掉要删除的选手
          const filteredPlayers = allPlayers.filter(player => !selectedIds.includes(player.id));
          
          // 更新数据
          app.globalData.players = filteredPlayers;
          wx.setStorageSync('players', filteredPlayers);
          
          // 更新显示
          this.setData({
            playersList: filteredPlayers,
            filteredPlayersList: filteredPlayers,
            selectedPlayerIds: [],
            allPlayersSelected: false
          });
          
          // 更新统计信息
          this.getAdminStats();
          
          // 刷新玩家信息
          if (!this.data.userInfo.isAdmin) {
            this.getPlayerInfo();
          } else {
            // 管理员也需要刷新胜率数据，确保数据一致性
            this.getPlayerInfo();
          }
          
          wx.showToast({
            title: `成功删除 ${selectedIds.length} 名选手`,
            icon: 'success'
          });
        }
      }
    });
  },
  
  /**
   * 切换批量选择历史记录模式
   */
  toggleBatchSelectHistory: function() {
    // 切换批量选择模式
    const newMode = !this.data.batchSelectHistory;
    
    this.setData({
      batchSelectHistory: newMode,
      selectedHistoryIds: [], // 清空已选择的ID
      allHistorySelected: false
    });
  },
  
  /**
   * 切换全选/取消全选历史记录
   */
  toggleSelectAllHistory: function() {
    const currentState = this.data.allHistorySelected;
    const allHistory = this.data.matchHistoryList;
    
    if (currentState) {
      // 取消全选
      this.setData({
        selectedHistoryIds: [],
        allHistorySelected: false
      });
    } else {
      // 全选所有历史记录
      const allIds = allHistory.map(record => record.id);
      this.setData({
        selectedHistoryIds: allIds,
        allHistorySelected: true
      });
    }
  },
  
  /**
   * 切换单个历史记录的选择状态
   */
  toggleHistorySelection: function(e) {
    const recordId = e.currentTarget.dataset.id;
    const selectedIds = [...this.data.selectedHistoryIds];
    const index = selectedIds.indexOf(recordId);
    
    if (index !== -1) {
      // 已选中，取消选择
      selectedIds.splice(index, 1);
    } else {
      // 未选中，添加选择
      selectedIds.push(recordId);
    }
    
    // 检查是否全选
    const allHistorySelected = selectedIds.length === this.data.matchHistoryList.length;
    
    this.setData({
      selectedHistoryIds: selectedIds,
      allHistorySelected
    });
  },
  
  /**
   * 批量删除历史记录
   */
  batchDeleteHistory: function() {
    const selectedIds = this.data.selectedHistoryIds;
    
    if (selectedIds.length === 0) {
      wx.showToast({
        title: '请先选择记录',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedIds.length} 条历史记录吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          // 获取当前所有历史记录
          const allHistory = app.globalData.matchHistory || [];
          
          // 处理要删除的每条记录，更新选手积分和胜负记录
          selectedIds.forEach(recordId => {
            const matchToDelete = allHistory.find(match => match.id === recordId);
            if (matchToDelete) {
              this.updatePlayerStatsForDeletedMatch(matchToDelete);
            }
          });
          
          // 过滤掉要删除的记录
          const filteredHistory = allHistory.filter(match => !selectedIds.includes(match.id));
          
          // 更新数据
          app.globalData.matchHistory = filteredHistory;
          wx.setStorageSync('matchHistory', filteredHistory);
          
          // 更新处理后的记录列表
          this.loadMatchHistory();
          
          // 重置选择状态
          this.setData({
            selectedHistoryIds: [],
            allHistorySelected: false
          });
          
          // 更新统计信息
          this.getAdminStats();
          
          // 刷新玩家信息和胜率数据
          if (!this.data.userInfo.isAdmin) {
            this.getPlayerInfo();
          } else {
            // 管理员也需要刷新胜率数据，确保数据一致性
            this.getPlayerInfo();
          }
          
          wx.showToast({
            title: `成功删除 ${selectedIds.length} 条记录`,
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 删除历史记录
   */
  deleteMatchHistory: function(e) {
    const matchId = e.currentTarget.dataset.id;
    const matchHistory = app.globalData.matchHistory || [];
    const matchIndex = matchHistory.findIndex(m => m.id === matchId);
    
    if (matchIndex !== -1) {
      const matchToDelete = matchHistory[matchIndex];
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条历史记录吗？此操作不可恢复。',
        success: (res) => {
          if (res.confirm) {
            // 在删除记录前先更新选手积分和胜负记录
            this.updatePlayerStatsForDeletedMatch(matchToDelete);
            
            // 删除记录
            matchHistory.splice(matchIndex, 1);
            app.globalData.matchHistory = matchHistory;
            wx.setStorageSync('matchHistory', matchHistory);
            
            // 更新处理后的记录列表
            this.loadMatchHistory();
            
            // 更新统计信息
            this.getAdminStats();
            
            // 刷新玩家信息和胜率数据
            if (!this.data.userInfo.isAdmin) {
              this.getPlayerInfo();
            }
            
            wx.showToast({
              title: '记录已删除',
              icon: 'success'
            });
          }
        }
      });
    }
  },
  
  /**
   * 更新被删除比赛相关选手的积分和胜负记录
   */
  updatePlayerStatsForDeletedMatch: function(matchToDelete) {
    // 获取所有选手数据
    const allPlayers = wx.getStorageSync('players') || [];
    
    // 确定获胜方和失败方
    const leftWin = matchToDelete.leftScore > matchToDelete.rightScore;
    const winnerTeam = leftWin ? matchToDelete.leftTeam : matchToDelete.rightTeam;
    const loserTeam = leftWin ? matchToDelete.rightTeam : matchToDelete.leftTeam;
    
    // 获取积分变化值
    let winnerChange = 20;
    let loserChange = -20;
    if (matchToDelete.winnerChange && matchToDelete.loserChange) {
      // 优先使用winnerChange和loserChange（精确值）
      winnerChange = matchToDelete.winnerChange;
      loserChange = matchToDelete.loserChange;
    } else if (matchToDelete.ratingChange) {
      // 使用ratingChange（可能不够精确）
      winnerChange = matchToDelete.ratingChange;
      loserChange = -matchToDelete.ratingChange;
    } else {
      // 默认值，如果没有记录
      console.warn('删除的比赛记录缺少积分变化数据:', matchToDelete.id);
      winnerChange = 20;
      loserChange = -20;
    }
    
    // 更新获胜方积分和胜负场次
    winnerTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 减去之前获得的积分
        allPlayers[index].score = Math.max(500, (allPlayers[index].score || 1000) - winnerChange);
        // 减少胜场数
        allPlayers[index].wins = Math.max(0, (allPlayers[index].wins || 0) - 1);
        
        // 更新单打/双打胜负统计
        if (winnerTeam.length === 1) {
          allPlayers[index].singlesWins = Math.max(0, (allPlayers[index].singlesWins || 0) - 1);
        } else {
          allPlayers[index].doublesWins = Math.max(0, (allPlayers[index].doublesWins || 0) - 1);
          
          // 更新具体双打类型统计
          this.updateDoublesTypeStatsForDeletedMatch(allPlayers[index], true, loserTeam);
        }
        
        // 更新胜率
        this.recalculatePlayerWinRates(allPlayers[index]);
      }
    });
    
    // 更新失败方积分和胜负场次
    loserTeam.forEach(player => {
      const index = allPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        // 加回之前扣除的积分（注意loserChange是负值，所以用减法）
        allPlayers[index].score = Math.min(10000, Math.max(500, (allPlayers[index].score || 1000) - loserChange));
        // 减少负场数
        allPlayers[index].losses = Math.max(0, (allPlayers[index].losses || 0) - 1);
        
        // 更新单打/双打胜负统计
        if (loserTeam.length === 1) {
          allPlayers[index].singlesLosses = Math.max(0, (allPlayers[index].singlesLosses || 0) - 1);
        } else {
          allPlayers[index].doublesLosses = Math.max(0, (allPlayers[index].doublesLosses || 0) - 1);
          
          // 更新具体双打类型统计
          this.updateDoublesTypeStatsForDeletedMatch(allPlayers[index], false, winnerTeam);
        }
        
        // 更新胜率
        this.recalculatePlayerWinRates(allPlayers[index]);
      }
    });
    
    // 保存更新后的选手数据
    app.globalData.players = allPlayers;
    wx.setStorageSync('players', allPlayers);
  },
  
  /**
   * 更新删除比赛后的双打类型统计
   */
  updateDoublesTypeStatsForDeletedMatch: function(player, isWinner, opposingTeam) {
    // 判断双打类型
    const allPlayers = app.globalData.players || [];
    
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
      if (isWinner) {
        player.maleDoublesWins = Math.max(0, (player.maleDoublesWins || 0) - 1);
      } else {
        player.maleDoublesLosses = Math.max(0, (player.maleDoublesLosses || 0) - 1);
      }
    } else if (doublesType === 'female') {
      if (isWinner) {
        player.femaleDoublesWins = Math.max(0, (player.femaleDoublesWins || 0) - 1);
      } else {
        player.femaleDoublesLosses = Math.max(0, (player.femaleDoublesLosses || 0) - 1);
      }
    } else {
      if (isWinner) {
        player.mixedDoublesWins = Math.max(0, (player.mixedDoublesWins || 0) - 1);
      } else {
        player.mixedDoublesLosses = Math.max(0, (player.mixedDoublesLosses || 0) - 1);
      }
    }
  },
  
  /**
   * 重新计算选手胜率
   */
  recalculatePlayerWinRates: function(player) {
    // 计算总胜率
    const totalWins = (player.singlesWins || 0) + (player.doublesWins || 0);
    const totalLosses = (player.singlesLosses || 0) + (player.doublesLosses || 0);
    const totalMatches = totalWins + totalLosses;
    
    const singlesTotal = (player.singlesWins || 0) + (player.singlesLosses || 0);
    const doublesTotal = (player.doublesWins || 0) + (player.doublesLosses || 0);
    
    player.winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '0%';
    player.singlesWinRate = singlesTotal > 0 ? Math.round((player.singlesWins / singlesTotal) * 100) + '%' : '0%';
    player.doublesWinRate = doublesTotal > 0 ? Math.round((player.doublesWins / doublesTotal) * 100) + '%' : '0%';
    
    // 计算各类双打胜率
    const maleDoublesTotal = (player.maleDoublesWins || 0) + (player.maleDoublesLosses || 0);
    const femaleDoublesTotal = (player.femaleDoublesWins || 0) + (player.femaleDoublesLosses || 0);
    const mixedDoublesTotal = (player.mixedDoublesWins || 0) + (player.mixedDoublesLosses || 0);
    
    player.maleDoublesWinRate = maleDoublesTotal > 0 ? Math.round((player.maleDoublesWins / maleDoublesTotal) * 100) + '%' : '0%';
    player.femaleDoublesWinRate = femaleDoublesTotal > 0 ? Math.round((player.femaleDoublesWins / femaleDoublesTotal) * 100) + '%' : '0%';
    player.mixedDoublesWinRate = mixedDoublesTotal > 0 ? Math.round((player.mixedDoublesWins / mixedDoublesTotal) * 100) + '%' : '0%';
  },

  /**
   * 获取最近的积分变化
   * @param {string} playerId 玩家ID
   */
  getRecentScoreChanges: function(playerId) {
    // 从存储中获取最新的比赛历史记录
    const matchHistory = wx.getStorageSync('matchHistory') || [];
    
    // 按时间倒序排序，获取最近的记录
    const sortedHistory = [...matchHistory].sort((a, b) => {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
    
    // 初始化积分变化
    let recentWin = null;
    let recentLose = null;
    
    // 查找最近的胜利和失败记录
    for (let i = 0; i < sortedHistory.length; i++) {
      const match = sortedHistory[i];
      
      // 检查玩家是否在左队
      const inLeftTeam = match.leftTeam && match.leftTeam.some(p => p.id === playerId);
      // 检查玩家是否在右队
      const inRightTeam = match.rightTeam && match.rightTeam.some(p => p.id === playerId);
      
      if (!inLeftTeam && !inRightTeam) {
        // 玩家不在这场比赛中
        continue;
      }
      
      const leftWin = match.leftScore > match.rightScore;
      const isWin = (inLeftTeam && leftWin) || (inRightTeam && !leftWin);
      
      // 根据胜负情况记录积分变化
      if (isWin && recentWin === null) {
        // 使用调整后的积分变化
        recentWin = match.winnerChange || match.ratingChange || 0;
      } else if (!isWin && recentLose === null) {
        // 使用调整后的积分变化（取绝对值）
        recentLose = Math.abs(match.loserChange || match.ratingChange || 0);
      }
      
      // 如果已经找到了最近的胜利和失败记录，就可以结束循环
      if (recentWin !== null && recentLose !== null) {
        break;
      }
    }
    
    // 更新数据
    this.setData({
      recentScoreChanges: {
        win: recentWin,
        lose: recentLose
      }
    });
  },

  /**
   * 处理选手搜索输入
   */
  onPlayerSearchInput: function(e) {
    const searchText = e.detail.value.trim().toLowerCase();
    this.setData({
      playerSearchText: e.detail.value
    });
    
    this.filterPlayersList(searchText);
  },
  
  /**
   * 清除选手搜索
   */
  clearPlayerSearch: function() {
    this.setData({
      playerSearchText: ''
    });
    
    this.filterPlayersList('');
  },
  
  /**
   * 根据搜索文本过滤选手列表
   */
  filterPlayersList: function(searchText) {
    if (!searchText) {
      // 如果没有搜索文本，显示全部选手
      this.setData({
        filteredPlayersList: this.data.playersList
      });
      return;
    }
    
    const filtered = this.data.playersList.filter(player => {
      return player.name.toLowerCase().includes(searchText);
    });
    
    this.setData({
      filteredPlayersList: filtered
    });
  },
  
  /**
   * 处理历史记录搜索输入
   */
  onHistorySearchInput: function(e) {
    const searchText = e.detail.value.trim().toLowerCase();
    this.setData({
      historySearchText: e.detail.value
    });
    
    this.filterHistoryList(searchText);
  },
  
  /**
   * 清除历史记录搜索
   */
  clearHistorySearch: function() {
    this.setData({
      historySearchText: ''
    });
    
    this.filterHistoryList('');
  },
  
  /**
   * 根据搜索文本过滤历史记录列表
   */
  filterHistoryList: function(searchText) {
    if (!searchText) {
      // 如果没有搜索文本，显示全部历史记录
      this.setData({
        filteredHistoryList: this.data.matchHistoryList
      });
      return;
    }
    
    const filtered = this.data.matchHistoryList.filter(record => {
      // 搜索左方队伍名称、右方队伍名称、日期
      return (
        record.leftTeamNames.toLowerCase().includes(searchText) ||
        record.rightTeamNames.toLowerCase().includes(searchText) ||
        record.displayDate.toLowerCase().includes(searchText) ||
        record.scoreResult.includes(searchText)
      );
    });
    
    this.setData({
      filteredHistoryList: filtered
    });
  },

  /**
   * 刷新选手列表
   */
  refreshPlayersList: function() {
    // 从存储中获取最新数据
    const allPlayers = wx.getStorageSync('players') || [];
    app.globalData.players = allPlayers; // 更新全局数据
    
    // 更新列表，保持搜索和选择状态
    const currentSearch = this.data.playerSearchText;
    
    this.setData({
      playersList: allPlayers
    });
    
    // 如果有搜索文本，重新过滤
    if (currentSearch) {
      this.filterPlayersList(currentSearch);
    } else {
      this.setData({
        filteredPlayersList: allPlayers
      });
    }
  },

  /**
   * 刷新历史记录列表
   */
  refreshHistoryList: function() {
    // 重新加载历史记录
    this.loadMatchHistory();
    
    // 如果有搜索文本，重新过滤
    const currentSearch = this.data.historySearchText;
    if (currentSearch) {
      this.filterHistoryList(currentSearch);
    }
  },
}); 