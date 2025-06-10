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
    if ((mode === 'singles' && selectedPlayers.length < minPlayers) || 
        (mode === 'doubles' && selectedPlayers.length / 2 < minPlayers)) {
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
} 