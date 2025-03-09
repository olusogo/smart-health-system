// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthDataSharing {
    struct HealthcareExpert {
        string name;
        string specialization;
        uint yearsOfExperience;
        bool isRegistered;
    }

    struct ResearchInstitute {
        string name;
        bool isRegistered;
    }

    struct FamilyMember {
        string name;
        bool isRegistered;
    }

    // Mapping of healthcare experts to their details
    mapping(address => HealthcareExpert) public healthcareExperts;

    // Mapping of patients to their registration status
    mapping(address => bool) public registeredPatients;

    // Mapping of research institutes to their details
    mapping(address => ResearchInstitute) public researchInstitutes;

    // Mapping of family members to their details
    mapping(address => FamilyMember) public familyMembers;

    // Mapping of patients to their healthcare experts
    mapping(address => address[]) public patientExpertsList;

    // Mapping to check if a healthcare expert is assigned to a patient
    mapping(address => mapping(address => bool)) public patientExperts;

    // Mapping of patients to their family members
    mapping(address => address[]) public patientFamilyMembersList;

    // Mapping of patients to their notifications from healthcare experts
    mapping(address => string[]) private patientNotifications;

    // Mapping of patients to the last time they sent health data
    mapping(address => uint) public lastHealthDataTime;

    // Mapping of patients to their consent status for sharing data with R.I.
    mapping(address => bool) public patientConsentToRI;

    // List of registered patients
    address[] private patientList;

    // List of registered healthcare experts
    address[] private expertList;

    // List of registered research institutes
    address[] private researchInstituteList;

    // List of registered family members
    address[] private familyMemberList;

    // Events for logging all significant actions
    event HealthcareExpertRegistered(address expert, string name, string specialization, uint yearsOfExperience);
    event PatientRegistered(address patient);
    event ResearchInstituteRegistered(address institute, string name);
    event FamilyMemberRegistered(address familyMember, string name);
    event HealthcareExpertAdded(address patient, address expert);
    event HealthcareExpertRemoved(address patient, address expert);
    event HealthDataSent(address patient, string data);
    event MessageSent(address expert, address patient, string message);
    event HealthDataReceived(address expert, string data);
    event HealthDataRequest(address patient);
    event PatientConsentToRI(address patient, bool consent);
    event PatientRewarded(address patient, uint amount);
    event HealthDataSentToRI(address expert, address patient, address researchInstitute, string data);
    event FamilyMemberNotified(address patient, address familyMember, string message);
    // New events for family member actions
    event FamilyMemberAdded(address patient, address familyMember);
    event FamilyMemberRemoved(address patient, address familyMember);

    // Modifiers
    modifier onlyRegisteredExpert() {
        require(healthcareExperts[msg.sender].isRegistered, "Caller is not a registered healthcare expert");
        _;
    }

    modifier onlyRegisteredPatient() {
        require(registeredPatients[msg.sender], "Caller is not a registered patient");
        _;
    }

    modifier onlyRegisteredResearchInstitute() {
        require(researchInstitutes[msg.sender].isRegistered, "Caller is not a registered research institute");
        _;
    }

    modifier onlyRegisteredFamilyMember() {
        require(familyMembers[msg.sender].isRegistered, "Caller is not a registered family member");
        _;
    }

    // Function for patients to register
    function registerAsPatient() public {
        require(!registeredPatients[msg.sender], "Patient is already registered");
        registeredPatients[msg.sender] = true;
        patientList.push(msg.sender);
        emit PatientRegistered(msg.sender);
    }

    // Function for healthcare experts to register
    function registerAsHealthcareExpert(string memory name, string memory specialization, uint yearsOfExperience) public {
        require(!healthcareExperts[msg.sender].isRegistered, "Expert is already registered");
        healthcareExperts[msg.sender] = HealthcareExpert({
            name: name,
            specialization: specialization,
            yearsOfExperience: yearsOfExperience,
            isRegistered: true
        });
        expertList.push(msg.sender);
        emit HealthcareExpertRegistered(msg.sender, name, specialization, yearsOfExperience);
    }

    // Function for research institutes to register
    function registerAsResearchInstitute(string memory name) public {
        require(!researchInstitutes[msg.sender].isRegistered, "Institute is already registered");
        researchInstitutes[msg.sender] = ResearchInstitute({
            name: name,
            isRegistered: true
        });
        researchInstituteList.push(msg.sender);
        emit ResearchInstituteRegistered(msg.sender, name);
    }

    // Function for family members to register
    function registerAsFamilyMember(string memory name) public {
        require(!familyMembers[msg.sender].isRegistered, "Family member is already registered");
        familyMembers[msg.sender] = FamilyMember({
            name: name,
            isRegistered: true
        });
        familyMemberList.push(msg.sender);
        emit FamilyMemberRegistered(msg.sender, name);
    }

    // Function for patients to add healthcare experts
    function addHealthcareExpert(address expert) public onlyRegisteredPatient {
        require(healthcareExperts[expert].isRegistered, "Expert is not registered");
        require(!patientExperts[msg.sender][expert], "Expert is already added");

        patientExperts[msg.sender][expert] = true;
        patientExpertsList[msg.sender].push(expert);
        emit HealthcareExpertAdded(msg.sender, expert);
    }

    // Function for patients to remove healthcare experts
    function removeHealthcareExpert(address expert) public onlyRegisteredPatient {
        require(patientExperts[msg.sender][expert], "Expert is not assigned to this patient");

        patientExperts[msg.sender][expert] = false;
        address[] storage expertsList = patientExpertsList[msg.sender];
        for (uint i = 0; i < expertsList.length; i++) {
            if (expertsList[i] == expert) {
                expertsList[i] = expertsList[expertsList.length - 1];
                expertsList.pop();
                break;
            }
        }
        emit HealthcareExpertRemoved(msg.sender, expert);
    }

    // Function for patients to add family members (updated with event)
    function addFamilyMember(address familyMember) public onlyRegisteredPatient {
        require(familyMembers[familyMember].isRegistered, "Family member is not registered");
        patientFamilyMembersList[msg.sender].push(familyMember);
        emit FamilyMemberAdded(msg.sender, familyMember);
    }

    // Function for patients to remove family members (new)
    function removeFamilyMember(address familyMember) public onlyRegisteredPatient {
        address[] storage familyMembersList = patientFamilyMembersList[msg.sender];
        for (uint i = 0; i < familyMembersList.length; i++) {
            if (familyMembersList[i] == familyMember) {
                familyMembersList[i] = familyMembersList[familyMembersList.length - 1];
                familyMembersList.pop();
                emit FamilyMemberRemoved(msg.sender, familyMember);
                return;
            }
        }
        revert("Family member not found");
    }

    // Function for patients to send health data
    function sendHealthData(string memory data) public onlyRegisteredPatient {
        lastHealthDataTime[msg.sender] = block.timestamp;
        emit HealthDataSent(msg.sender, data);

        address[] memory expertsList = patientExpertsList[msg.sender];
        for (uint i = 0; i < expertsList.length; i++) {
            if (patientExperts[msg.sender][expertsList[i]]) {
                emit HealthDataReceived(expertsList[i], data);
            }
        }

        address[] memory familyMembersList = patientFamilyMembersList[msg.sender];
        for (uint i = 0; i < familyMembersList.length; i++) {
            emit FamilyMemberNotified(msg.sender, familyMembersList[i], "Health data sent");
        }
    }

    // Function for healthcare experts to send a message to a patient
    function sendMessageToPatient(address patient, string memory message) public onlyRegisteredExpert {
        require(patientExperts[patient][msg.sender], "You are not authorized to send a message to this patient");
        require(bytes(message).length > 0, "Message cannot be empty");

        patientNotifications[patient].push(message);
        emit MessageSent(msg.sender, patient, message);

        address[] memory familyMembersList = patientFamilyMembersList[patient];
        for (uint i = 0; i < familyMembersList.length; i++) {
            emit FamilyMemberNotified(patient, familyMembersList[i], message);
        }
    }

    // Function for patients to view their notifications
    function viewNotifications() public view onlyRegisteredPatient returns (string[] memory) {
        string[] memory notifications = patientNotifications[msg.sender];
        if (block.timestamp >= lastHealthDataTime[msg.sender] + 1 hours) {
            string[] memory updatedNotifications = new string[](notifications.length + 1);
            for (uint i = 0; i < notifications.length; i++) {
                updatedNotifications[i] = notifications[i];
            }
            updatedNotifications[notifications.length] = "Reminder: Please send your health data.";
            return updatedNotifications;
        }
        return notifications;
    }

    // Function to check and notify patients to send health data
    function checkHealthDataTime() public {
        uint currentTime = block.timestamp;
        for (uint i = 0; i < patientList.length; i++) {
            address patient = patientList[i];
            if (currentTime >= lastHealthDataTime[patient] + 1 hours) {
                emit HealthDataRequest(patient);
            }
        }
    }

    // Function to get the total number of registered healthcare experts
    function getTotalHealthcareExperts() public view returns (uint) {
        return expertList.length;
    }

    // Function to get the addresses of all registered healthcare experts
    function getHealthcareExpertAddresses() public view returns (address[] memory) {
        return expertList;
    }

    // Function to get the total number of registered patients
    function getTotalPatients() public view returns (uint) {
        return patientList.length;
    }

    // Function to get the addresses of all registered patients
    function getPatientAddresses() public view returns (address[] memory) {
        return patientList;
    }

    // Function to get the last health data timestamp of a patient
    function getLastHealthDataTime(address patient) public view returns (uint) {
        return lastHealthDataTime[patient];
    }

    // Function to check if a patient needs to send health data
    function needsToSendHealthData(address patient) public view returns (bool) {
        uint currentTime = block.timestamp;
        return currentTime >= lastHealthDataTime[patient] + 1 hours;
    }

    // Function for patients to give or withdraw consent for sharing data with R.I.
    function setConsentToRI(bool consent) public onlyRegisteredPatient {
        patientConsentToRI[msg.sender] = consent;
        emit PatientConsentToRI(msg.sender, consent);
    }

    // Function for research institutes to reward patients
    function rewardPatient(address patient) public payable onlyRegisteredResearchInstitute {
        require(patientConsentToRI[patient], "Patient has not given consent to share data with R.I.");
        require(registeredPatients[patient], "Patient is not registered");

        (bool success, ) = patient.call{value: msg.value}("");
        require(success, "Transfer failed");

        emit PatientRewarded(patient, msg.value);
    }

    // Function for healthcare experts to send health data to research institutes
    function sendHealthDataToRI(address patient, address researchInstitute, string memory data) public onlyRegisteredExpert {
        require(patientConsentToRI[patient], "Patient has not given consent to share data with R.I.");
        require(patientExperts[patient][msg.sender], "You are not authorized to send data for this patient");
        require(researchInstitutes[researchInstitute].isRegistered, "Research institute is not registered");

        emit HealthDataSentToRI(msg.sender, patient, researchInstitute, data);
    }

    // Function to calculate a patient's privacy score (new)
    function getPrivacyScore(address patient) public view returns (uint) {
        require(registeredPatients[patient], "Patient is not registered");
        uint numExperts = patientExpertsList[patient].length;
        uint penalty = 10 * numExperts + (patientConsentToRI[patient] ? 20 : 0);
        return penalty > 100 ? 0 : 100 - penalty;
    }
}