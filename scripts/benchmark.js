const { ethers } = require("hardhat");

async function main() {
  // Set your deployed contract address here:
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Get signers and create test accounts
  const [deployer, ...testAccounts] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  // Ensure we have 20 test accounts
  while (testAccounts.length < 19) {
    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    testAccounts.push(wallet);
  }
  const accounts = [deployer, ...testAccounts.slice(0, 19)];
  console.log(`Using ${accounts.length} accounts for testing`);

  // Attach to the deployed contract
  const Contract = await ethers.getContractFactory("HealthDataSharing");
  const contract = await Contract.attach(contractAddress);
  console.log("Attached to contract at address:", contract.address);

  // Track account statuses to avoid registration errors
  const accountStatus = new Map();
  for (const account of accounts) {
    accountStatus.set(account.address, {
      isPatient: false,
      isExpert: false,
      isInstitute: false,
      isFamilyMember: false,
      experts: new Set(), // Experts added by this patient
      submittedHealthData: false, // Whether this patient has submitted health data
    });
  }

  // Define transaction batches with an additional 25,000 transactions batch
  const batches = [1000, 5000, 10000, 15000, 25000];

  for (const batchSize of batches) {
    console.log(`\n--- Running ${batchSize} transactions ---`);
    await runTransactionBatch(contract, accounts, batchSize, accountStatus);
  }
}

async function runTransactionBatch(contract, accounts, totalTransactions, accountStatus) {
  const results = {
    txSuccess: 0, // Successes for transactional functions
    viewSuccess: 0, // Successes for view functions
    failed: 0,
    totalTime: 0, // Total time for transactional functions only
    errors: {},
  };

  const startTime = Date.now();
  const transactionsPerAccount = Math.ceil(totalTransactions / accounts.length);
  const promises = [];

  for (let i = 0; i < accounts.length; i++) {
    const accountTransactions = Math.min(
      transactionsPerAccount,
      totalTransactions - i * transactionsPerAccount
    );

    if (accountTransactions <= 0) break;

    const accountPromise = processAccountTransactions(
      contract,
      accounts[i],
      accounts,
      accountTransactions,
      accountStatus,
      results
    );

    promises.push(accountPromise);
  }

  await Promise.all(promises);
  const endTime = Date.now();
  const totalTimeSeconds = (endTime - startTime) / 1000;

  // Calculate metrics
  const totalSuccess = results.txSuccess + results.viewSuccess;
  const successRate = (totalSuccess / totalTransactions) * 100;
  const avgTransactionTime = results.txSuccess > 0 ? results.totalTime / results.txSuccess / 1000 : 0;

  console.log(`Completed batch of ${totalTransactions} transactions`);
  console.log(`Success rate: ${successRate.toFixed(2)}% (${totalSuccess}/${totalTransactions})`);
  console.log(`Average transaction time (transactional functions): ${avgTransactionTime.toFixed(4)} seconds`);
  console.log(`Total batch time: ${totalTimeSeconds.toFixed(2)} seconds`);

  if (results.failed > 0) {
    console.log("Error distribution:");
    for (const [error, count] of Object.entries(results.errors)) {
      console.log(`- ${error}: ${count} occurrences`);
    }
  }

  return results;
}

async function processAccountTransactions(contract, account, allAccounts, count, accountStatus, results) {
  const status = accountStatus.get(account.address);

  for (let i = 0; i < count; i++) {
    const txType = chooseTransactionType(status, allAccounts, accountStatus);

    try {
      switch (txType) {
        case "registerAsPatient":
          await executeTransaction(() => contract.connect(account).registerAsPatient(), results);
          status.isPatient = true;
          break;

        case "registerAsHealthcareExpert":
          await executeTransaction(() =>
            contract.connect(account).registerAsHealthcareExpert(
              `Expert ${account.address.slice(0, 6)}`,
              ["Cardiology", "Neurology", "Pediatrics", "Oncology"][Math.floor(Math.random() * 4)],
              Math.floor(Math.random() * 20) + 1
            ),
            results
          );
          status.isExpert = true;
          break;

        case "registerAsResearchInstitute":
          await executeTransaction(() =>
            contract.connect(account).registerAsResearchInstitute(
              `Institute ${account.address.slice(0, 6)}`
            ),
            results
          );
          status.isInstitute = true;
          break;

        case "registerAsFamilyMember":
          await executeTransaction(() =>
            contract.connect(account).registerAsFamilyMember(
              `Family ${account.address.slice(0, 6)}`
            ),
            results
          );
          status.isFamilyMember = true;
          break;

        case "addHealthcareExpert":
          const expertAccount = findAccountWithRole(allAccounts, accountStatus, "isExpert", status.experts);
          if (expertAccount) {
            await executeTransaction(() => contract.connect(account).addHealthcareExpert(expertAccount.address), results);
            status.experts.add(expertAccount.address);
          }
          break;

        case "sendHealthData":
          const healthData = `Health data sample ${i} from ${account.address.slice(0, 6)}`;
          await executeTransaction(() => contract.connect(account).sendHealthData(healthData), results);
          status.submittedHealthData = true;
          break;

        case "removeHealthcareExpert":
          if (status.experts.size > 0) {
            const expertToRemove = Array.from(status.experts)[0];
            await executeTransaction(() => contract.connect(account).removeHealthcareExpert(expertToRemove), results);
            status.experts.delete(expertToRemove);
          }
          break;

        case "addFamilyMember":
          const familyAccount = findAccountWithRole(allAccounts, accountStatus, "isFamilyMember");
          if (familyAccount) {
            await executeTransaction(() => contract.connect(account).addFamilyMember(familyAccount.address), results);
          }
          break;

        case "sendMessageToPatient":
          for (const otherAccount of allAccounts) {
            const otherStatus = accountStatus.get(otherAccount.address);
            if (otherStatus.isPatient && otherStatus.experts.has(account.address)) {
              await executeTransaction(() => contract.connect(account).sendMessageToPatient(
                otherAccount.address,
                `Message from expert ${account.address.slice(0, 6)}`
              ), results);
              break;
            }
          }
          break;

        case "setConsentToRI":
          const consent = Math.random() > 0.5;
          await executeTransaction(() => contract.connect(account).setConsentToRI(consent), results);
          break;

        case "checkHealthDataTime":
          await executeTransaction(() => contract.connect(account).checkHealthDataTime(), results);
          break;

        case "viewNotifications":
          await contract.connect(account).viewNotifications();
          results.viewSuccess++;
          break;
      }
    } catch (error) {
      results.failed++;
      const errorMessage = error.message.split('\n')[0].trim();
      if (!results.errors[errorMessage]) {
        results.errors[errorMessage] = 0;
      }
      results.errors[errorMessage]++;

      // Update status based on specific errors
      if (errorMessage.includes("Patient is already registered")) {
        status.isPatient = true;
      } else if (errorMessage.includes("Expert is already registered")) {
        status.isExpert = true;
      } else if (errorMessage.includes("Institute is already registered")) {
        status.isInstitute = true;
      } else if (errorMessage.includes("Family member is already registered")) {
        status.isFamilyMember = true;
      }

      if (i === 0) {
        console.log(`Transaction error for ${account.address}: ${errorMessage}`);
      }
    }

    // Small delay to prevent nonce issues
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

function chooseTransactionType(accountStatus, allAccounts, allStatuses) {
  // First-time registration
  if (!accountStatus.isPatient && Math.random() < 0.4) {
    return "registerAsPatient";
  }
  if (!accountStatus.isExpert && Math.random() < 0.3) {
    return "registerAsHealthcareExpert";
  }
  if (!accountStatus.isInstitute && Math.random() < 0.2) {
    return "registerAsResearchInstitute";
  }
  if (!accountStatus.isFamilyMember && Math.random() < 0.2) {
    return "registerAsFamilyMember";
  }

  // Patient-specific actions
  if (accountStatus.isPatient) {
    const patientActions = [
      "addHealthcareExpert",
      "sendHealthData",
      "removeHealthcareExpert",
      "addFamilyMember",
      "setConsentToRI",
      "viewNotifications",
    ];
    return patientActions[Math.floor(Math.random() * patientActions.length)];
  }

  // Expert-specific actions
  if (accountStatus.isExpert) {
    return "sendMessageToPatient";
  }

  // Default action
  return "checkHealthDataTime";
}

function findAccountWithRole(accounts, statuses, role, excludeSet = null) {
  const eligibleAccounts = accounts.filter(acc => {
    const status = statuses.get(acc.address);
    return status[role] && (!excludeSet || !excludeSet.has(acc.address));
  });

  if (eligibleAccounts.length > 0) {
    return eligibleAccounts[Math.floor(Math.random() * eligibleAccounts.length)];
  }
  return null;
}

async function executeTransaction(txFunc, results) {
  const startTime = Date.now();
  try {
    const tx = await txFunc();
    await tx.wait();
    results.txSuccess++;
    results.totalTime += Date.now() - startTime;
  } catch (error) {
    throw error;
  }
}

async function runWithTimeout(timeoutMs) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`Script execution timed out after ${timeoutMs / 1000} seconds`);
      resolve();
    }, timeoutMs);

    main()
      .then(() => {
        clearTimeout(timeout);
        resolve();
      })
      .catch((error) => {
        console.error("Error in main execution:", error);
        clearTimeout(timeout);
        resolve();
      });
  });
}

runWithTimeout(30 * 60 * 1000)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });