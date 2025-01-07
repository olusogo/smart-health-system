/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337, // Add this line
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337, // Add this line
      gasPrice: 20000000000, // 20 gwei
      gas: 5000000,
    },
  },
};
