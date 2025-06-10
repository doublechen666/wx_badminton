// 测试ELO积分计算
const app = getApp();

Page({
  data: {
    testResults: []
  },

  onLoad: function() {
    this.runTests();
  },

  runTests: function() {
    const testResults = [];
    
    // 测试不同分数区间的加分倍率
    testResults.push(this.testScoreRange("1000分选手(5倍加分)", 1000, 1500, 21, 10));
    testResults.push(this.testScoreRange("1999分选手(5倍加分)", 1999, 1500, 21, 10));
    testResults.push(this.testScoreRange("2000分选手(3倍加分)", 2000, 1500, 21, 10));
    testResults.push(this.testScoreRange("2500分选手(3倍加分)", 2500, 1500, 21, 10));
    testResults.push(this.testScoreRange("2999分选手(3倍加分)", 2999, 1500, 21, 10));
    testResults.push(this.testScoreRange("3000分选手(2倍加分)", 3000, 1500, 21, 10));
    testResults.push(this.testScoreRange("3500分选手(2倍加分)", 3500, 1500, 21, 10));
    testResults.push(this.testScoreRange("3999分选手(2倍加分)", 3999, 1500, 21, 10));
    testResults.push(this.testScoreRange("4000分选手(正常加分)", 4000, 1500, 21, 10));
    testResults.push(this.testScoreRange("4500分选手(正常加分)", 4500, 1500, 21, 10));
    
    // 测试失败方是否不受倍率影响
    testResults.push(this.testScoreRange("1000分选手(输方不变倍率)", 1000, 4500, 10, 21, false));
    testResults.push(this.testScoreRange("2500分选手(输方不变倍率)", 2500, 4500, 10, 21, false));
    testResults.push(this.testScoreRange("3500分选手(输方不变倍率)", 3500, 4500, 10, 21, false));
    testResults.push(this.testScoreRange("4500分选手(输方不变倍率)", 4500, 1000, 10, 21, false));
    
    this.setData({
      testResults: testResults
    });
  },

  testScoreRange: function(testName, playerScore, opponentScore, playerGameScore, opponentGameScore, playerWins = true) {
    // 创建模拟选手
    const player = {
      id: "test_player",
      name: "测试选手",
      score: playerScore
    };
    
    const opponent = {
      id: "test_opponent",
      name: "对手",
      score: opponentScore
    };
    
    // 备份原始全局数据
    const originalPlayers = [...app.globalData.players];
    
    // 设置测试数据
    app.globalData.players = [player, opponent];
    
    // 创建模拟比赛数据
    const matchData = {
      leftTeam: [player],
      rightTeam: [opponent],
      leftScore: playerWins ? playerGameScore : opponentGameScore,
      rightScore: playerWins ? opponentGameScore : playerGameScore
    };
    
    // 计算积分变化
    const scoreChanges = app.submitMatch(matchData);
    
    // 获取更新后的选手数据
    const updatedPlayer = app.globalData.players.find(p => p.id === "test_player");
    const updatedOpponent = app.globalData.players.find(p => p.id === "test_opponent");
    
    // 恢复原始全局数据
    app.globalData.players = originalPlayers;
    
    // 计算实际分数变化
    const actualPlayerChange = updatedPlayer.score - playerScore;
    const actualOpponentChange = updatedOpponent.score - opponentScore;
    
    // 返回测试结果
    return {
      testName: testName,
      originalScore: playerScore,
      newScore: updatedPlayer.score,
      scoreChange: actualPlayerChange,
      expectedMultiplier: playerScore < 2000 ? 5 : 
                          playerScore < 3000 ? 3 : 
                          playerScore < 4000 ? 2 : 1,
      opponentOriginalScore: opponentScore,
      opponentNewScore: updatedOpponent.score,
      opponentScoreChange: actualOpponentChange,
      result: playerWins ? "胜利" : "失败"
    };
  }
}); 