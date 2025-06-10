// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentUser: null,
    playerInfo: null,
    allMatches: [],
    filteredMatches: [],
    playersList: [],
    doubleTeamsList: [],
    scrollToView: '', // 添加滚动视图ID
    
    // 统计数据
    stats: {
      totalMatches: 0,
      totalWins: 0,
      totalLosses: 0,
      totalPercent: 0
    },
    
    // 筛选设置
    filterSelf: true,
    hasTeamFilter: false,
    hasOpponentFilter: false,
    teamFilter: [],
    opponentFilter: [],
    
    // 弹窗控制
    showTeamModal: false,
    showOpponentModal: false,
    showPlayerStatsModal: false,
    
    // 当前查看的选手统计
    currentPlayerStats: {},
    
    // 可用对手列表
    availableOpponents: {
      singles: [],
      doubles: []
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.initUserData();
    this.loadMatches();
    this.loadPlayers();
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    console.log('历史记录页面显示');
    // 刷新数据
    this.refreshData();
  },
  
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // 页面隐藏时的处理逻辑
  },
  
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 页面卸载时的处理逻辑
  },

  /**
   * 刷新所有数据
   */
  refreshData: function() {
    console.log('刷新历史记录数据');
    // 清除之前的数据
    this.setData({
      allMatches: [],
      filteredMatches: []
    });
    
    // 重新加载数据
    this.initUserData();
    this.loadMatches();
    this.loadPlayers();
    
    // 显示刷新提示
    wx.showToast({
      title: '数据已刷新',
      icon: 'success',
      duration: 1000
    });
  },

  /**
   * 用户下拉刷新操作
   */
  onPullDownRefresh: function() {
    this.refreshData();
    // 停止下拉刷新动画
    wx.stopPullDownRefresh();
  },

  /**
   * 初始化用户数据
   */
  initUserData: function() {
    // 获取当前登录用户
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      currentUser: userInfo
    });
    
    // 获取用户关联的选手信息 - 确保从存储中获取最新数据
    const allPlayers = wx.getStorageSync('players') || [];
    app.globalData.players = allPlayers; // 同步全局数据
    
    let playerInfo = allPlayers.find(p => p.userId === userInfo.userId);
    
    // 如果是管理员账号，尝试获取"小飞"选手信息
    if (userInfo.isAdmin && !playerInfo) {
      playerInfo = allPlayers.find(p => p.name === '小飞');
      console.log('管理员账号，获取小飞选手信息:', playerInfo ? playerInfo.name + ' 排位分:' + playerInfo.score : '未找到小飞选手');
    }
    
    if (playerInfo) {
      console.log('获取到用户关联的选手信息:', playerInfo.name, '排位分:', playerInfo.score);
      this.setData({
        playerInfo: playerInfo
      });
    } else if (!userInfo.isAdmin) {
      wx.showToast({
        title: '请先注册选手',
        icon: 'none'
      });
    }
  },
  
  /**
   * 加载比赛记录
   */
  loadMatches: function() {
    try {
      console.log('开始加载比赛记录');
      
      // 从存储获取最新的比赛记录和选手数据
      let matchHistory = wx.getStorageSync('matchHistory') || [];
      const allPlayers = wx.getStorageSync('players') || [];
      
      // 检查是否有其他模式的比赛记录需要合并
      const randomRotationMatches = wx.getStorageSync('randomRotationMatches') || [];
      const mixedRandomMatches = wx.getStorageSync('mixedRandomMatches') || [];
      const roundRobinMatches = wx.getStorageSync('roundRobinMatches') || [];
      const swissMatches = wx.getStorageSync('swissMatches') || [];
      
      // 合并所有来源的比赛记录
      const allMatches = [
        ...matchHistory,
        ...randomRotationMatches,
        ...mixedRandomMatches,
        ...roundRobinMatches,
        ...swissMatches
      ];
      
      // 去重 - 根据比赛ID
      const uniqueMatchesMap = new Map();
      allMatches.forEach(match => {
        if (match && match.id) {
          uniqueMatchesMap.set(match.id, match);
        }
      });
      
      // 转换回数组
      matchHistory = Array.from(uniqueMatchesMap.values());
      
      console.log('从存储加载的比赛记录数:', matchHistory.length);
      console.log('从存储加载的选手数:', allPlayers.length);
      
      // 如果没有比赛记录，直接设置空数组并返回
      if (matchHistory.length === 0) {
        this.setData({
          allMatches: [],
          filteredMatches: []
        });
        console.log('没有找到比赛记录');
        return;
      }
      
      // 更新全局数据，确保一致性
      app.globalData.matchHistory = matchHistory;
      app.globalData.players = allPlayers;
      
      // 创建名字到选手的映射，用于通过名字查找选手
      const playerNameMap = {};
      allPlayers.forEach(player => {
        if (player && player.name) {
          playerNameMap[player.name] = player;
        }
      });

      // 获取当前用户信息
      const userInfo = this.data.currentUser;
      const isAdmin = userInfo && userInfo.isAdmin;
      
      // 如果是管理员账号，确保能够获取"小飞"的比赛记录
      let targetPlayerId = this.data.playerInfo ? this.data.playerInfo.id : null;
      if (isAdmin && !targetPlayerId) {
        const xiaofeiPlayer = allPlayers.find(p => p.name === '小飞');
        if (xiaofeiPlayer) {
          targetPlayerId = xiaofeiPlayer.id;
          console.log('管理员账号，将显示小飞的比赛记录，ID:', targetPlayerId);
          
          // 更新playerInfo以确保实时显示最新的排位分
          this.setData({
            playerInfo: xiaofeiPlayer
          });
        }
      } else if (this.data.playerInfo) {
        // 确保显示的是最新的排位分
        const updatedPlayerInfo = allPlayers.find(p => p.id === this.data.playerInfo.id);
        if (updatedPlayerInfo && updatedPlayerInfo.score !== this.data.playerInfo.score) {
          console.log('更新选手排位分:', updatedPlayerInfo.name, '新分数:', updatedPlayerInfo.score);
          this.setData({
            playerInfo: updatedPlayerInfo
          });
        }
      }
      
      // 处理比赛记录，添加额外信息
      const processedMatches = matchHistory.map(match => {
        try {
          if (!match) {
            console.warn('发现无效的比赛记录');
            return null;
          }
          
          // 检查必要的字段
          if (!match.leftTeam || !match.rightTeam) {
            console.warn('比赛记录缺少队伍信息:', match.id);
            return null;
          }
          
          // 查找详细的选手信息，优先通过ID查找，如果找不到则通过名字查找
          const leftTeam = match.leftTeam.map(player => {
            if (!player) return null;
            
            // 首先尝试通过ID查找
            let playerInfo = allPlayers.find(p => p && p.id === player.id);
            
            // 如果找不到，尝试通过名字查找
            if (!playerInfo && player.name) {
              playerInfo = playerNameMap[player.name];
            }
            
            // 如果仍然找不到，使用原始数据
            return playerInfo || player;
          }).filter(p => p !== null);
          
          const rightTeam = match.rightTeam.map(player => {
            if (!player) return null;
            
            // 首先尝试通过ID查找
            let playerInfo = allPlayers.find(p => p && p.id === player.id);
            
            // 如果找不到，尝试通过名字查找
            if (!playerInfo && player.name) {
              playerInfo = playerNameMap[player.name];
            }
            
            // 如果仍然找不到，使用原始数据
            return playerInfo || player;
          }).filter(p => p !== null);
          
          // 确定胜负
          const leftWin = match.leftScore > match.rightScore;
          
          // 格式化日期
          let displayDate = '';
          
          try {
            if (match.date) {
              const matchDate = new Date(match.date);
              if (!isNaN(matchDate.getTime())) {
                displayDate = `${matchDate.getFullYear()}-${this.padZero(matchDate.getMonth() + 1)}-${this.padZero(matchDate.getDate())} ${this.padZero(matchDate.getHours())}:${this.padZero(matchDate.getMinutes())}`;
              }
            }
          } catch (error) {
            console.error('日期格式化错误:', error);
          }
          
          // 格式化团队名称
          const leftTeamNames = leftTeam.map(p => p.name || '未知').join(' & ');
          const rightTeamNames = rightTeam.map(p => p.name || '未知').join(' & ');
          
          // 格式化比分
          const scoreResult = `${match.leftScore}:${match.rightScore}`;
          
          // 处理积分变化数据
          let leftRatingChange = 0;
          let rightRatingChange = 0;
          
          if (match.winnerChange && match.loserChange) {
            // 优先使用winnerChange和loserChange（精确值）
            if (leftWin) {
              leftRatingChange = match.winnerChange;
              rightRatingChange = Math.abs(match.loserChange); // 取绝对值，因为loserChange是负数
            } else {
              rightRatingChange = match.winnerChange;
              leftRatingChange = Math.abs(match.loserChange); // 取绝对值，因为loserChange是负数
            }
          } else if (match.ratingChange) {
            // 如果没有winnerChange但有ratingChange，使用ratingChange
            leftRatingChange = leftWin ? match.ratingChange : Math.abs(match.ratingChange);
            rightRatingChange = leftWin ? Math.abs(match.ratingChange) : match.ratingChange;
          } else {
            // 没有任何积分变化记录，使用默认值
            leftRatingChange = leftWin ? 20 : 20;
            rightRatingChange = leftWin ? 20 : 20;
          }
          
          // 返回处理后的比赛记录
          return {
            ...match,
            leftTeam,
            rightTeam,
            displayDate,
            leftTeamNames,
            rightTeamNames,
            scoreResult,
            leftWin,
            leftRatingChange,
            rightRatingChange
          };
        } catch (error) {
          console.error('处理比赛记录出错:', error);
          return null;
        }
      }).filter(match => match !== null);
      
      // 按日期排序，最新的在前面
      processedMatches.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA; // 降序排列
      });
      
      this.setData({
        allMatches: processedMatches
      });
      
      // 应用筛选条件
      this.filterMatches();
      
      // 设置滚动视图ID - 修改为空字符串，使页面默认显示在顶部
      this.setData({
        scrollToView: ''
      });
    } catch (error) {
      console.error('加载比赛记录出错:', error);
      // 确保即使出错也显示一些内容
      this.setData({
        allMatches: [],
        filteredMatches: []
      });
      
      wx.showToast({
        title: '加载比赛记录失败',
        icon: 'none'
      });
    }
  },
  
  /**
   * 日期时间补零
   */
  padZero: function(num) {
    return num < 10 ? '0' + num : num;
  },
  
  /**
   * 加载选手数据
   */
  loadPlayers: function() {
    // 从存储获取最新的选手数据
    const allPlayers = wx.getStorageSync('players') || [];
    
    // 更新全局数据，确保一致性
    app.globalData.players = allPlayers;
    
    // 整理双打组合列表
    const doubleTeamsList = this.generateDoubleTeams(allPlayers);
    
    this.setData({
      playersList: allPlayers,
      doubleTeamsList
    });
    
    // 更新可用对手列表
    this.updateAvailableOpponents();
  },
  
  /**
   * 生成双打组合列表
   */
  generateDoubleTeams: function(players) {
    const teams = [];
    const matchHistory = app.globalData.matchHistory || [];
    
    // 从历史记录中提取双打组合
    matchHistory.forEach(match => {
      if (match.leftTeam.length === 2) {
        this.addTeamIfNotExists(teams, match.leftTeam, players);
      }
      if (match.rightTeam.length === 2) {
        this.addTeamIfNotExists(teams, match.rightTeam, players);
      }
    });
    
    return teams;
  },
  
  /**
   * 添加不存在的队伍到列表中
   */
  addTeamIfNotExists: function(teams, team, allPlayers) {
    // 排序队伍成员ID，确保A+B和B+A被识别为相同队伍
    const sortedIds = [...team].sort((a, b) => a.id.localeCompare(b.id)).map(p => p.id);
    const teamId = sortedIds.join('_');
    
    // 检查是否已存在
    if (!teams.some(t => t.id === teamId)) {
      // 获取队伍成员的详细信息
      const teamMembers = sortedIds.map(id => {
        return allPlayers.find(p => p.id === id) || { id, name: '未知选手', gender: 'male' };
      });
      
      // 确定双打类型（男双、女双、混双）
      let teamType = 'mixed'; // 默认为混双
      if (teamMembers.every(m => m.gender === 'male')) {
        teamType = 'male'; // 男双
      } else if (teamMembers.every(m => m.gender === 'female')) {
        teamType = 'female'; // 女双
      }
      
      // 添加双打类型前缀
      const typePrefix = teamType === 'male' ? '[男双] ' : (teamType === 'female' ? '[女双] ' : '[混双] ');
      
      teams.push({
        id: teamId,
        type: 'double',
        members: teamMembers,
        doubleType: teamType,
        name: typePrefix + teamMembers.map(m => m.name).join(' + ')
      });
    }
  },
  
  /**
   * 筛选比赛记录
   */
  filterMatches: function() {
    try {
      console.log('开始筛选比赛记录');
      
      // 检查是否有比赛记录
      if (!this.data.allMatches || this.data.allMatches.length === 0) {
        console.log('没有比赛记录可筛选');
        this.setData({
          filteredMatches: [],
          stats: {
            totalMatches: 0,
            totalWins: 0,
            totalLosses: 0,
            totalPercent: 0
          }
        });
        return;
      }
      
      // 复制一份比赛记录进行筛选
      let matches = [...this.data.allMatches];
      console.log('总比赛记录数:', matches.length);
      
      const currentPlayerId = this.data.playerInfo ? this.data.playerInfo.id : null;
      const userInfo = this.data.currentUser;
      const isAdmin = userInfo && userInfo.isAdmin;
      
      console.log('当前用户ID:', currentPlayerId, '是否管理员:', isAdmin);
      
      // 应用"仅自己"筛选
      if (this.data.filterSelf && currentPlayerId) {
        console.log('应用"仅自己"筛选');
        const beforeFilterCount = matches.length;
        
        matches = matches.filter(match => {
          if (!match || !match.leftTeam || !match.rightTeam) {
            return false;
          }
          
          // 检查左侧队伍
          const inLeftTeam = match.leftTeam && match.leftTeam.some(player => player && player.id === currentPlayerId);
          // 检查右侧队伍
          const inRightTeam = match.rightTeam && match.rightTeam.some(player => player && player.id === currentPlayerId);
          
          return inLeftTeam || inRightTeam;
        });
        
        console.log('筛选前记录数:', beforeFilterCount, '筛选后比赛记录数:', matches.length);
        
        // 确保当前用户显示在左侧
        matches = matches.map(match => {
          if (!match.leftTeam || !match.rightTeam) {
            console.warn('发现无效的比赛记录:', match);
            return match;
          }
          
          const inLeftTeam = match.leftTeam.some(player => player && player.id === currentPlayerId);
          
          if (!inLeftTeam) {
            // 交换左右队伍位置，同时交换积分变化
            return {
              ...match,
              leftTeam: match.rightTeam,
              rightTeam: match.leftTeam,
              leftScore: match.rightScore,
              rightScore: match.leftScore,
              leftWin: !match.leftWin,
              leftRatingChange: match.rightRatingChange,
              rightRatingChange: match.leftRatingChange,
              leftTeamNames: match.rightTeamNames,
              rightTeamNames: match.leftTeamNames
            };
          }
          
          return match;
        });
        
        // 对双打队伍进行排序，确保当前用户在上方
        matches = matches.map(match => {
          if (match.leftTeam && match.leftTeam.length === 2) {
            // 按ID排序，确保当前用户在前
            match.leftTeam.sort((a, b) => {
              if (a && b && a.id === currentPlayerId) return -1;
              if (a && b && b.id === currentPlayerId) return 1;
              return 0;
            });
          }
          return match;
        });
      }
      
      // 应用队伍筛选
      if (this.data.hasTeamFilter && this.data.teamFilter && this.data.teamFilter.length > 0) {
        console.log('应用队伍筛选');
        matches = matches.filter(match => {
          try {
            // 检查是否匹配选中的队伍筛选条件
            for (const filter of this.data.teamFilter) {
              if (filter.type === 'single') {
                // 单打筛选 - 检查双方队伍
                if ((match.leftTeam && match.leftTeam.length === 1 && match.leftTeam[0] && match.leftTeam[0].id === filter.id) ||
                    (match.rightTeam && match.rightTeam.length === 1 && match.rightTeam[0] && match.rightTeam[0].id === filter.id)) {
                  return true;
                }
              } else if (filter.type === 'double') {
                // 双打筛选 - 检查双方队伍
                if (match.leftTeam && match.leftTeam.length === 2) {
                  const leftTeamIds = match.leftTeam.filter(p => p).map(p => p.id).sort().join('_');
                  if (filter.id === leftTeamIds) {
                    return true;
                  }
                }
                if (match.rightTeam && match.rightTeam.length === 2) {
                  const rightTeamIds = match.rightTeam.filter(p => p).map(p => p.id).sort().join('_');
                  if (filter.id === rightTeamIds) {
                    return true;
                  }
                }
              }
            }
            return false;
          } catch (err) {
            console.error('队伍筛选出错:', err);
            return false;
          }
        });
        console.log('队伍筛选后比赛记录数:', matches.length);
        
        // 将筛选到的己方队伍移到左侧
        matches = matches.map(match => {
          try {
            let shouldSwap = false;
            
            for (const filter of this.data.teamFilter) {
              if (filter.type === 'single' && match.rightTeam && match.rightTeam.length === 1) {
                // 单打 - 检查右侧是否是己方
                if (match.rightTeam[0] && match.rightTeam[0].id === filter.id) {
                  shouldSwap = true;
                  break;
                }
              } else if (filter.type === 'double' && match.rightTeam && match.rightTeam.length === 2) {
                // 双打 - 检查右侧是否是己方
                const rightTeamIds = match.rightTeam.filter(p => p).map(p => p.id).sort().join('_');
                if (filter.id === rightTeamIds) {
                  shouldSwap = true;
                  break;
                }
              }
            }
            
            if (shouldSwap) {
              // 交换左右队伍位置，同时交换积分变化
              return {
                ...match,
                leftTeam: match.rightTeam,
                rightTeam: match.leftTeam,
                leftScore: match.rightScore,
                rightScore: match.leftScore,
                leftWin: !match.leftWin,
                leftRatingChange: match.rightRatingChange,
                rightRatingChange: match.leftRatingChange,
                leftTeamNames: match.rightTeamNames,
                rightTeamNames: match.leftTeamNames
              };
            }
            
            return match;
          } catch (err) {
            console.error('交换队伍出错:', err);
            return match;
          }
        });
      }
      
      // 应用对手筛选
      if (this.data.hasOpponentFilter && this.data.opponentFilter && this.data.opponentFilter.length > 0) {
        console.log('应用对手筛选');
        matches = matches.filter(match => {
          try {
            // 检查是否匹配选中的对手筛选条件
            for (const filter of this.data.opponentFilter) {
              if (filter.type === 'single') {
                // 单打对手筛选
                if (match.rightTeam && match.rightTeam.length === 1 && match.rightTeam[0] && match.rightTeam[0].id === filter.id) {
                  return true;
                }
              } else if (filter.type === 'double') {
                // 双打对手筛选
                if (match.rightTeam && match.rightTeam.length === 2) {
                  const teamIds = match.rightTeam.filter(p => p).map(p => p.id).sort().join('_');
                  if (filter.id === teamIds) {
                    return true;
                  }
                }
              }
            }
            return false;
          } catch (err) {
            console.error('对手筛选出错:', err);
            return false;
          }
        });
        console.log('对手筛选后比赛记录数:', matches.length);
      }
      
      this.setData({
        filteredMatches: matches
      });
      
      // 更新可用对手列表
      this.updateAvailableOpponents();
      
      // 更新统计数据
      this.updateStats();
      
      console.log('筛选完成，最终比赛记录数:', matches.length);
      
      // 设置滚动视图ID - 修改为空字符串，使页面默认显示在顶部
      this.setData({
        scrollToView: ''
      });
    } catch (error) {
      console.error('筛选比赛记录出错:', error);
      // 确保即使出错也显示一些内容
      this.setData({
        filteredMatches: [],
        stats: {
          totalMatches: 0,
          totalWins: 0,
          totalLosses: 0,
          totalPercent: 0
        }
      });
    }
  },
  
  /**
   * 更新统计数据
   */
  updateStats: function() {
    try {
      const { filteredMatches } = this.data;
      
      if (!filteredMatches || filteredMatches.length === 0) {
        this.setData({
          stats: {
            totalMatches: 0,
            totalWins: 0,
            totalLosses: 0,
            totalPercent: 0
          },
          showFilterStats: false
        });
        return;
      }
      
      // 计算左侧队伍的胜负场次
      let totalWins = 0;
      let totalLosses = 0;
      
      filteredMatches.forEach(match => {
        if (match && match.leftWin !== undefined) {
          if (match.leftWin) {
            totalWins++;
          } else {
            totalLosses++;
          }
        }
      });
      
      // 计算胜率百分比
      const totalPercent = Math.round((totalWins / Math.max(1, totalWins + totalLosses)) * 100);
      
      // 更新统计数据
      this.setData({
        stats: {
          totalMatches: filteredMatches.length,
          totalWins,
          totalLosses,
          totalPercent
        },
        showFilterStats: true
      });
    } catch (error) {
      console.error('更新统计数据出错:', error);
      // 确保即使出错也显示一些内容
      this.setData({
        stats: {
          totalMatches: 0,
          totalWins: 0,
          totalLosses: 0,
          totalPercent: 0
        },
        showFilterStats: false
      });
    }
  },
  
  /**
   * 更新可用对手列表
   */
  updateAvailableOpponents: function() {
    const matches = this.data.filteredMatches;
    const singles = [];
    const doubles = [];
    const allPlayers = app.globalData.players || [];
    
    // 提取所有对手
    matches.forEach(match => {
      if (match.rightTeam.length === 1) {
        // 单打对手
        const opponent = match.rightTeam[0];
        if (!singles.some(p => p.id === opponent.id)) {
          singles.push(opponent);
        }
      } else {
        // 双打对手
        const teamId = match.rightTeam.map(p => p.id).sort().join('_');
        if (!doubles.some(t => t.id === teamId)) {
          // 获取完整的选手信息（包括性别）
          const teamMembers = match.rightTeam.map(p => {
            // 确保获取最新的选手信息，特别是性别信息
            return allPlayers.find(player => player.id === p.id) || p;
          });
          
          // 确定双打类型（男双、女双、混双）
          let teamType = 'mixed'; // 默认为混双
          if (teamMembers.every(m => m.gender === 'male')) {
            teamType = 'male'; // 男双
          } else if (teamMembers.every(m => m.gender === 'female')) {
            teamType = 'female'; // 女双
          }
          
          // 添加双打类型前缀
          const typePrefix = teamType === 'male' ? '[男双] ' : (teamType === 'female' ? '[女双] ' : '[混双] ');
          
          doubles.push({
            id: teamId,
            type: 'double',
            members: teamMembers,
            doubleType: teamType,
            name: typePrefix + teamMembers.map(p => p.name).join(' + ')
          });
        }
      }
    });
    
    this.setData({
      'availableOpponents.singles': singles,
      'availableOpponents.doubles': doubles
    });
  },
  
  /**
   * 切换仅自己筛选
   */
  toggleSelfFilter: function() {
    this.setData({
      filterSelf: !this.data.filterSelf
    }, () => {
      this.filterMatches();
      this.updateStats();
    });
  },
  
  /**
   * 显示队伍筛选弹窗
   */
  showTeamFilterModal: function() {
    this.setData({
      showTeamModal: true
    });
  },
  
  /**
   * 隐藏队伍筛选弹窗
   */
  hideTeamFilterModal: function() {
    this.setData({
      showTeamModal: false
    });
  },
  
  /**
   * 切换队伍筛选
   */
  toggleTeamFilter: function(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    const filter = [...this.data.teamFilter];
    
    // 检查是否已选中
    const index = filter.findIndex(f => f.id === id && f.type === type);
    
    if (index === -1) {
      // 添加筛选
      let name = '未知';
      if (type === 'single') {
        // 查找单打选手名称
        const player = this.data.playersList.find(p => p.id === id);
        if (player) name = player.name;
      } else {
        // 查找双打队伍名称
        const team = this.data.doubleTeamsList.find(t => t.id === id);
        if (team) name = team.name;
      }
      filter.push({ id, type, name });
    } else {
      // 移除筛选
      filter.splice(index, 1);
    }
    
    this.setData({
      teamFilter: filter
    });
  },
  
  /**
   * 检查队伍是否已选中
   */
  isTeamSelected: function(id, type) {
    return this.data.teamFilter.some(f => f.id === id && f.type === type);
  },
  
  /**
   * 选择所有队伍（清除队伍筛选）
   */
  selectAllTeams: function() {
    this.setData({
      teamFilter: [],
      hasTeamFilter: false,
      showTeamModal: false
    }, () => {
      this.filterMatches();
      this.updateStats();
    });
  },
  
  /**
   * 清除队伍筛选
   */
  clearTeamFilter: function() {
    this.setData({
      teamFilter: []
    });
  },
  
  /**
   * 应用队伍筛选
   */
  applyTeamFilter: function() {
    this.setData({
      hasTeamFilter: this.data.teamFilter.length > 0,
      showTeamModal: false
    }, () => {
      this.filterMatches();
      this.updateStats();
    });
  },
  
  /**
   * 显示对手筛选弹窗
   */
  showOpponentFilterModal: function() {
    this.setData({
      showOpponentModal: true
    });
  },
  
  /**
   * 隐藏对手筛选弹窗
   */
  hideOpponentFilterModal: function() {
    this.setData({
      showOpponentModal: false
    });
  },
  
  /**
   * 切换对手筛选
   */
  toggleOpponentFilter: function(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    const filter = [...this.data.opponentFilter];
    
    // 检查是否已选中
    const index = filter.findIndex(f => f.id === id && f.type === type);
    
    if (index === -1) {
      // 添加筛选
      let name = '未知';
      if (type === 'single') {
        // 查找单打对手名称
        const opponent = this.data.availableOpponents.singles.find(p => p.id === id);
        if (opponent) name = opponent.name;
      } else {
        // 查找双打队伍名称
        const team = this.data.availableOpponents.doubles.find(t => t.id === id);
        if (team) name = team.name;
      }
      filter.push({ id, type, name });
    } else {
      // 移除筛选
      filter.splice(index, 1);
    }
    
    this.setData({
      opponentFilter: filter
    });
  },
  
  /**
   * 检查对手是否已选中
   */
  isOpponentSelected: function(id, type) {
    return this.data.opponentFilter.some(f => f.id === id && f.type === type);
  },
  
  /**
   * 选择所有对手（清除对手筛选）
   */
  selectAllOpponents: function() {
    this.setData({
      opponentFilter: [],
      hasOpponentFilter: false,
      showOpponentModal: false
    }, () => {
      this.filterMatches();
      this.updateStats();
    });
  },
  
  /**
   * 清除对手筛选
   */
  clearOpponentFilter: function() {
    this.setData({
      opponentFilter: []
    });
  },
  
  /**
   * 应用对手筛选
   */
  applyOpponentFilter: function() {
    this.setData({
      hasOpponentFilter: this.data.opponentFilter.length > 0,
      showOpponentModal: false
    }, () => {
      this.filterMatches();
      this.updateStats();
    });
  },
  
  /**
   * 显示选手统计信息
   */
  showPlayerStats: function(e) {
    const playerId = e.currentTarget.dataset.playerId;
    const allPlayers = app.globalData.players || [];
    const matchHistory = app.globalData.matchHistory || [];
    
    // 查找选手信息
    const playerInfo = allPlayers.find(p => p.id === playerId);
    
    if (!playerInfo) {
      wx.showToast({
        title: '未找到选手信息',
        icon: 'none'
      });
      return;
    }
    
    // 初始化统计数据
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
      const inLeftTeam = match.leftTeam.some(p => p.id === playerId);
      // 检查玩家是否在右队
      const inRightTeam = match.rightTeam.some(p => p.id === playerId);
      
      if (!inLeftTeam && !inRightTeam) {
        // 玩家不在这场比赛中
        return;
      }
      
      const isWin = (inLeftTeam && match.leftScore > match.rightScore) || 
                    (inRightTeam && match.rightScore > match.leftScore);
      
      // 确定是单打还是双打
      const isSingles = match.leftTeam.length === 1 && match.rightTeam.length === 1;
      
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
    
    // 计算总胜负场
    const totalWins = singlesWins + doublesWins;
    const totalLosses = singlesLosses + doublesLosses;
    
    // 计算胜率
    const totalMatches = totalWins + totalLosses;
    const singlesMatches = singlesWins + singlesLosses;
    const doublesMatches = doublesWins + doublesLosses;
    const maleDoublesMatches = maleDoublesWins + maleDoublesLosses;
    const femaleDoublesMatches = femaleDoublesWins + femaleDoublesLosses;
    const mixedDoublesMatches = mixedDoublesWins + mixedDoublesLosses;
    
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '0%';
    const singlesWinRate = singlesMatches > 0 ? Math.round((singlesWins / singlesMatches) * 100) + '%' : '0%';
    const doublesWinRate = doublesMatches > 0 ? Math.round((doublesWins / doublesMatches) * 100) + '%' : '0%';
    const maleDoublesWinRate = maleDoublesMatches > 0 ? Math.round((maleDoublesWins / maleDoublesMatches) * 100) + '%' : '0%';
    const femaleDoublesWinRate = femaleDoublesMatches > 0 ? Math.round((femaleDoublesWins / femaleDoublesMatches) * 100) + '%' : '0%';
    const mixedDoublesWinRate = mixedDoublesMatches > 0 ? Math.round((mixedDoublesWins / mixedDoublesMatches) * 100) + '%' : '0%';
    
    // 更新统计信息
    const playerStats = {
      ...playerInfo,
      wins: totalWins,
      losses: totalLosses,
      singlesWins,
      singlesLosses,
      doublesWins,
      doublesLosses,
      winRate,
      singlesWinRate,
      doublesWinRate,
      // 双打详细数据
      maleDoublesWins,
      maleDoublesLosses,
      maleDoublesWinRate,
      femaleDoublesWins,
      femaleDoublesLosses,
      femaleDoublesWinRate,
      mixedDoublesWins,
      mixedDoublesLosses,
      mixedDoublesWinRate
    };
    
    this.setData({
      currentPlayerStats: playerStats,
      showPlayerStatsModal: true
    });
  },
  
  /**
   * 隐藏选手统计信息弹窗
   */
  hidePlayerStatsModal: function() {
    this.setData({
      showPlayerStatsModal: false
    });
  }
}); 