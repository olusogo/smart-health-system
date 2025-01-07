async function main() {
  const Contract = await ethers.getContractFactory("HealthDataSharing");
  const contract = await Contract.deploy();
  await contract.deployed();
  console.log("Contract deployed to address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
