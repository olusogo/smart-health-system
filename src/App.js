import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import './App.css';
import contractABI from './HealthDataSharing.json';

const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Replace with your contract address

const App = () => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [healthcareExperts, setHealthcareExperts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [expertAddress, setExpertAddress] = useState('');
  const [healthData, setHealthData] = useState('');
  const [message, setMessage] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [familyMemberAddress, setFamilyMemberAddress] = useState('');
  const [consentToRI, setConsentToRI] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [researchInstitutes, setResearchInstitutes] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyMemberName, setFamilyMemberName] = useState('');
  const [isPatient, setIsPatient] = useState(false);
  const [privacyScore, setPrivacyScore] = useState(null);

  // Initialize Web3 and Contract
  const initWeb3 = useCallback(async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);
        const contractInstance = new web3Instance.eth.Contract(contractABI, contractAddress);
        setContract(contractInstance);
        console.log("Contract initialized:", contractInstance);
      } catch (error) {
        console.error('Failed to load web3 or accounts:', error);
        alert('Failed to connect to MetaMask. Please ensure it is installed and unlocked.');
      }
    } else {
      alert('Please install MetaMask to use this dApp!');
    }
  }, []);

  useEffect(() => {
    initWeb3();
  }, [initWeb3]);

  // Handle account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => setAccount(accounts[0]));
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  // Fetch data when contract or account changes
  const fetchData = useCallback(async () => {
    if (contract && account) {
      setLoading(true);
      try {
        const experts = await contract.methods.getHealthcareExpertAddresses().call();
        setHealthcareExperts(experts);

        const patientList = await contract.methods.getPatientAddresses().call();
        setPatients(patientList);

        const notifs = await contract.methods.viewNotifications().call({ from: account });
        setNotifications(notifs);

        // Check if the account is a registered patient
        const isRegistered = await contract.methods.registeredPatients(account).call();
        setIsPatient(isRegistered);

        if (isRegistered) {
          // Fetch privacy score
          const score = await contract.methods.getPrivacyScore(account).call();
          setPrivacyScore(score);

          // Fetch patient's family members (up to 5 for simplicity)
          const maxFamilyMembers = 5;
          const familyMembersList = [];
          for (let i = 0; i < maxFamilyMembers; i++) {
            try {
              const member = await contract.methods.patientFamilyMembersList(account, i).call();
              if (member !== '0x0000000000000000000000000000000000000000') {
                familyMembersList.push(member);
              }
            } catch (error) {
              break; // Stop if index is out of bounds
            }
          }
          setFamilyMembers(familyMembersList);
        } else {
          setPrivacyScore(null);
          setFamilyMembers([]);
        }

        // Note: getResearchInstituteAddresses and getFamilyMembers don't exist in the contract.
        // For research institutes, this would need a custom getter function.
        // setResearchInstitutes(await contract.methods.getResearchInstituteAddresses().call());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [contract, account]);

  useEffect(() => {
    if (contract && account) {
      fetchData();
    }
  }, [contract, account, fetchData]);

  // Event Handlers

  const handleRegisterAsPatient = async () => {
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.registerAsPatient().send({ from: account });
      alert('Successfully registered as a patient!');
      fetchData();
    } catch (error) {
      console.error('Error registering as patient:', error);
      alert(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsHealthcareExpert = async () => {
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.registerAsHealthcareExpert("Doctor Name", "Specialization", 5).send({ from: account });
      alert('Successfully registered as a healthcare expert!');
      fetchData();
    } catch (error) {
      console.error('Error registering as healthcare expert:', error);
      alert(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHealthcareExpert = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.addHealthcareExpert(expertAddress).send({ from: account });
      alert('Successfully added healthcare expert!');
      setExpertAddress('');
      fetchData();
    } catch (error) {
      console.error('Error adding healthcare expert:', error);
      alert(`Failed to add: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendHealthData = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.sendHealthData(healthData).send({ from: account });
      alert('Successfully sent health data!');
      setHealthData('');
      fetchData();
    } catch (error) {
      console.error('Error sending health data:', error);
      alert(`Failed to send: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessageToPatient = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.sendMessageToPatient(patientAddress, message).send({ from: account });
      alert('Successfully sent message to patient!');
      setMessage('');
      setPatientAddress('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFamilyMember = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.addFamilyMember(familyMemberAddress).send({ from: account });
      alert('Successfully added family member!');
      setFamilyMemberAddress('');
      fetchData();
    } catch (error) {
      console.error('Error adding family member:', error);
      alert(`Failed to add: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFamilyMember = async (familyMember) => {
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.removeFamilyMember(familyMember).send({ from: account });
      alert('Successfully removed family member!');
      fetchData();
    } catch (error) {
      console.error('Error removing family member:', error);
      alert(`Failed to remove: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsResearchInstitute = async () => {
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.registerAsResearchInstitute("Research Institute Name").send({ from: account });
      alert('Successfully registered as a research institute!');
      fetchData();
    } catch (error) {
      console.error('Error registering as research institute:', error);
      alert(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetConsentToRI = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.setConsentToRI(consentToRI).send({ from: account });
      alert('Consent updated!');
      setConsentToRI(false);
      fetchData();
    } catch (error) {
      console.error('Error setting consent:', error);
      alert(`Failed to set consent: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRewardPatient = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.rewardPatient(patientAddress).send({
        from: account,
        value: web3.utils.toWei(rewardAmount.toString(), 'ether')
      });
      alert(`Successfully rewarded patient with ${rewardAmount} ETH!`);
      setPatientAddress('');
      setRewardAmount(0);
      fetchData();
    } catch (error) {
      console.error('Error rewarding patient:', error);
      alert(`Failed to reward: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsFamilyMember = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Contract not initialized");
    try {
      setLoading(true);
      await contract.methods.registerAsFamilyMember(familyMemberName).send({ from: account });
      alert('Successfully registered as a family member!');
      setFamilyMemberName('');
      fetchData();
    } catch (error) {
      console.error('Error registering as family member:', error);
      alert(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Health Data Management</h1>
        <p>Account: {account}</p>
        <div className="form-container">
          <button onClick={handleRegisterAsPatient} disabled={loading}>
            Register as Patient
          </button>
          <button onClick={handleRegisterAsHealthcareExpert} disabled={loading}>
            Register as Healthcare Expert
          </button>
          <button onClick={handleRegisterAsResearchInstitute} disabled={loading}>
            Register as Research Institute
          </button>
          <button onClick={handleRegisterAsFamilyMember} disabled={loading}>
            Register as Family Member
          </button>
        </div>
      </header>
      <main>
        {isPatient && (
          <section>
            <h2>Privacy Score</h2>
            <p>Your privacy score is: {privacyScore}</p>
            <p>
              (Score starts at 100. Penalties: -10 per healthcare expert, -20 if consent given to research institutes.)
            </p>
          </section>
        )}
        <section>
          <h2>Healthcare Experts</h2>
          <ul>
            {healthcareExperts.map((expert, index) => (
              <li key={index}>{expert}</li>
            ))}
          </ul>
          <form onSubmit={handleAddHealthcareExpert}>
            <input
              type="text"
              value={expertAddress}
              onChange={(e) => setExpertAddress(e.target.value)}
              placeholder="Healthcare Expert Address"
            />
            <button type="submit" disabled={loading}>Add Healthcare Expert</button>
          </form>
        </section>
        <section>
          <h2>Patients</h2>
          <ul>
            {patients.map((patient, index) => (
              <li key={index}>{patient}</li>
            ))}
          </ul>
          <form onSubmit={handleSendMessageToPatient}>
            <input
              type="text"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              placeholder="Patient Address"
            />
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
            />
            <button type="submit" disabled={loading}>Send Message to Patient</button>
          </form>
        </section>
        <section>
          <h2>Notifications</h2>
          <ul>
            {notifications.map((notification, index) => (
              <li key={index}>{notification}</li>
            ))}
          </ul>
        </section>
        {isPatient && (
          <section>
            <h2>Your Family Members</h2>
            <ul>
              {familyMembers.map((member, index) => (
                <li key={index}>
                  {member}
                  <button onClick={() => handleRemoveFamilyMember(member)} disabled={loading}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddFamilyMember}>
              <input
                type="text"
                value={familyMemberAddress}
                onChange={(e) => setFamilyMemberAddress(e.target.value)}
                placeholder="Family Member Address"
              />
              <button type="submit" disabled={loading}>Add Family Member</button>
            </form>
          </section>
        )}
        <section>
          <form onSubmit={handleSendHealthData}>
            <h2>Send Health Data</h2>
            <textarea
              value={healthData}
              onChange={(e) => setHealthData(e.target.value)}
              placeholder="Health Data"
            />
            <button type="submit" disabled={loading}>Send Health Data</button>
          </form>
        </section>
        <section>
          <form onSubmit={handleSetConsentToRI}>
            <h2>Set Consent to Research Institutes</h2>
            <label>
              <input
                type="checkbox"
                checked={consentToRI}
                onChange={(e) => setConsentToRI(e.target.checked)}
              />
              Consent to share data with Research Institutes
            </label>
            <button type="submit" disabled={loading}>Set Consent</button>
          </form>
        </section>
        <section>
          <form onSubmit={handleRewardPatient}>
            <h2>Reward Patient</h2>
            <input
              type="text"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              placeholder="Patient Address"
            />
            <input
              type="number"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(Number(e.target.value))}
              placeholder="Reward Amount (ETH)"
            />
            <button type="submit" disabled={loading}>Reward Patient</button>
          </form>
        </section>
        <section>
          <form onSubmit={handleRegisterAsFamilyMember}>
            <h2>Register as Family Member</h2>
            <input
              type="text"
              value={familyMemberName}
              onChange={(e) => setFamilyMemberName(e.target.value)}
              placeholder="Family Member Name"
            />
            <button type="submit" disabled={loading}>Register as Family Member</button>
          </form>
        </section>
      </main>
      {loading && <div className="loading">Processing...</div>}
    </div>
  );
};

export default App;