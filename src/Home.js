import React, { useState, useEffect } from "react";
import { ethers } from 'ethers';
import constants from './constants'; // Ensure constants.js exists with contractAddress and contractAbi

function Home() {
    const [currentAccount, setCurrentAccount] = useState("");
    const [contractInstance, setContractInstance] = useState(null); // Initialize as null
    const [lotteryComplete, setLotteryComplete] = useState(false);
    const [isWinner, setIsWinner] = useState(false);
    const [lotteryInfo, setLotteryInfo] = useState({
        contractAddress: constants.contractAddress,
        participantsCount: 0,
        prizePool: '0',
        winner: 'N/A',
        status: 'Đang tải...',
    });
    const [entryAmount, setEntryAmount] = useState('0.001'); // Default entry amount
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'

    // State to hold the provider instance
    const [provider, setProvider] = useState(null);


    useEffect(() => {
        const loadBlockchainData = async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    // Request account access
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    setProvider(provider); // Store the provider instance
                    const signer = provider.getSigner();
                    const address = await signer.getAddress();
                    console.log("Connected account:", address);
                    setCurrentAccount(address);

                    // Listen for account changes
                    window.ethereum.on('accountsChanged', (accounts) => {
                        setCurrentAccount(accounts[0]);
                        // Reload contract data if accounts change
                        if (accounts.length > 0) {
                             loadContractData(accounts[0], provider); // Pass provider
                        } else {
                            // Reset state if no accounts are connected
                            setContractInstance(null);
                            setCurrentAccount("");
                            setLotteryInfo({ ...lotteryInfo, participantsCount: 0, prizePool: '0', winner: 'N/A', status: 'Chưa kết nối' });
                        }
                    });

                     // Listen for chain changes
                    window.ethereum.on('chainChanged', (chainId) => {
                        console.log("Chain changed:", chainId);
                        // Reload the page on chain change (simplest approach)
                        window.location.reload();
                    });


                } catch (err) {
                    console.error("Error loading blockchain data:", err);
                     setMessage('Lỗi kết nối ví. Vui lòng kiểm tra MetaMask.');
                     setMessageType('error');
                }
            } else {
                setMessage('Vui lòng cài đặt MetaMask để sử dụng ứng dụng.');
                setMessageType('error');
            }
        };

        loadBlockchainData();
    }, []); // Empty dependency array means this effect runs only once on mount

     // Load contract data when currentAccount or provider changes
     useEffect(() => {
        if (currentAccount && provider) { // Ensure both are available
             loadContractData(currentAccount, provider);
        }
     }, [currentAccount, provider]); // Effect runs when currentAccount or provider changes


    const loadContractData = async (account, currentProvider) => {
        if (!currentProvider) return; // Ensure provider is available
        try {
            const signer = currentProvider.getSigner();
            // Create a new contract instance with the signer
            const contractIns = new ethers.Contract(constants.contractAddress, constants.contractAbi, signer);
            setContractInstance(contractIns);

            // Fetch lottery state from the contract using the correct function name
            const complete = await contractIns.isComplete(); // Using isComplete() as per ABI
            setLotteryComplete(complete);

            // Fetch participant count using getPlayers() and checking length
            const playersArray = await contractIns.getPlayers(); // Using getPlayers() as per ABI
            const participants = playersArray.length; // Get the length of the returned array

            // Fetch prize pool by getting the contract's balance using the provider
            const prize = await currentProvider.getBalance(constants.contractAddress); // Get balance using provider
            const prizeEth = ethers.utils.formatEther(prize); // Convert from Wei to ETH

            let winnerAddress = 'N/A';
            let currentStatus = complete ? 'Đã hoàn thành' : 'Đang mở';
            let userIsWinner = false;

            if (complete) {
                 try {
                    // Fetch winner address if lottery is complete (using getWinner() as per ABI)
                    winnerAddress = await contractIns.getWinner();
                    userIsWinner = winnerAddress.toLowerCase() === account.toLowerCase();
                 } catch (winErr) {
                     console.warn("Could not fetch winner, possibly not picked yet or error:", winErr);
                     winnerAddress = 'Chưa xác định';
                 }
            }

            setIsWinner(userIsWinner);
            setLotteryInfo({
                 ...lotteryInfo,
                 participantsCount: participants.toString(), // Convert number to string for display
                 prizePool: prizeEth,
                 status: currentStatus,
                 winner: winnerAddress,
            });


        } catch (error) {
            console.error("Error fetching contract state:", error);
            setMessage('Lỗi khi tải dữ liệu hợp đồng.');
            setMessageType('error');
        }
    };

    const handleEntryChange = (event) => {
      setEntryAmount(event.target.value);
    };

    const enterLottery = async () => {
        // Check if contract instance is available, account is connected, and lottery is not complete
        if (!contractInstance || !currentAccount || lotteryComplete) {
             setMessage('Không thể tham gia. Vui lòng kết nối ví hoặc chờ kỳ xổ số mới.');
             setMessageType('error');
            return;
        }
         // Validate entry amount
         if (parseFloat(entryAmount) <= 0) {
            setMessage('Số tiền tham gia phải lớn hơn 0.');
            setMessageType('error');
            return;
         }

        setMessage('Đang gửi giao dịch tham gia...');
        setMessageType('');
        try {
            // Convert entry amount to contract's smallest unit (e.g., Wei for ETH)
            const amountToSend = ethers.utils.parseEther(entryAmount);
            // Call the enter function on the smart contract, sending value
            const tx = await contractInstance.enter({ value: amountToSend });
            await tx.wait(); // Wait for the transaction to be mined
            setMessage('Tham gia thành công!');
            setMessageType('success');
            await loadContractData(currentAccount, provider); // Refresh contract state after successful entry
        } catch (error) {
            console.error("Enter failed:", error);
             // Display specific error message if available
             // Check if the error is a user rejection error (MetaMask code 4001)
             if (error.code === 4001) {
                 setMessage('Tham gia thất bại: Người dùng từ chối giao dịch');
             } else {
                setMessage(`Tham gia thất bại: ${error.reason || error.message}`);
             }
             setMessageType('error');
        }
    };

    const claimPrize = async () => {
        // Check if contract instance is available, account is connected, lottery is complete, and user is the winner
        if (!contractInstance || !currentAccount || !lotteryComplete || !isWinner) {
            setMessage('Không thể nhận giải. Bạn không phải người thắng hoặc xổ số chưa hoàn thành.');
            setMessageType('error');
            return;
        }

        setMessage('Đang gửi giao dịch nhận giải...');
        setMessageType('');
        try {
            // Call the claimPrize function on the smart contract
            const tx = await contractInstance.claimPrize(); // Using claimPrize() as per ABI
            await tx.wait(); // Wait for the transaction to be mined
            setMessage('Nhận giải thành công!');
            setMessageType('success');
            await loadContractData(currentAccount, provider); // Refresh contract state after claiming
        } catch (error) {
            console.error("Claim failed:", error);
             // Display specific error message if available
             setMessage(`Nhận giải thất bại: ${error.reason || error.message}`);
             setMessageType('error');
        }
    };

    return (
        <div className="container">
            <h1>Hệ thống Xổ số Phi tập trung</h1>

             {/* Section to prompt user to connect wallet if not connected */}
             {!currentAccount && (
                 <div className="section">
                     <h2>Kết nối ví</h2>
                     <p>Vui lòng kết nối ví MetaMask để tương tác với hệ thống.</p>
                     {/* The connect wallet logic is handled by the useEffect on mount */}
                 </div>
             )}

            {/* Display content only if a wallet is connected */}
            {currentAccount && (
                <>
                     {/* Section displaying connected wallet info */}
                     <div className="section">
                         <h2>Thông tin ví</h2>
                         <p>Địa chỉ ví đã kết nối: <strong>{currentAccount}</strong></p>
                         {/* Optional: Add display for wallet balance here */}
                     </div>

                    {/* Section displaying current lottery information */}
                    <div className="section">
                        <h2>Thông tin kỳ xổ số hiện tại</h2>
                        <p>Địa chỉ hợp đồng: <strong>{lotteryInfo.contractAddress}</strong></p>
                        <p>Số lượng người tham gia: <strong>{lotteryInfo.participantsCount}</strong></p>
                        <p>Tổng giải thưởng: <strong>{lotteryInfo.prizePool} ETH</strong></p> {/* Adjust unit if necessary */}
                        <p>Trạng thái: <strong>{lotteryInfo.status}</strong></p>
                         {/* Display winner if lottery is complete */}
                         {lotteryComplete && <p>Người thắng: <strong>{lotteryInfo.winner}</strong></p>}
                         {/* Optional: Add time remaining if contract supports it */}
                    </div>

                    {/* Section for participating in the lottery */}
                    <div className="section">
                        <h2>Tham gia xổ số</h2>
                        {lotteryComplete ? (
                             // Display if lottery is complete
                             isWinner ? (
                                 // Display if user is the winner
                                 <>
                                     <p className="message success">Chúc mừng! Bạn là người thắng cuộc!</p>
                                     <div className="button-container">
                                         {/* Button to claim prize */}
                                         <button className="claim-button" onClick={claimPrize} disabled={!contractInstance || !lotteryComplete || !isWinner}>Nhận giải thưởng</button> {/* Added disabled checks */}
                                     </div>
                                 </>
                             ) : (
                                 // Display if user is not the winner
                                 <p className="message">Kỳ xổ số đã kết thúc. Người thắng là: <strong>{lotteryInfo.winner}</strong></p>
                             )
                        ) : (
                            // Display if lottery is open
                            <>
                                <p>Nhập số ETH bạn muốn dùng để tham gia xổ số.</p>
                                <div>
                                    <label htmlFor="entryAmount">Số ETH:</label>
                                    <input
                                        id="entryAmount"
                                        type="number"
                                        value={entryAmount}
                                        onChange={handleEntryChange}
                                        placeholder="Nhập số ETH"
                                        step="0.001" // Allow small decimal values
                                    />
                                </div>
                                <div className="button-container">
                                    {/* Button to enter lottery */}
                                    <button className="enter-button" onClick={enterLottery} disabled={!contractInstance || lotteryComplete}> {/* Added disabled check */}
                                        Tham gia ngay!
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Display messages (success/error) */}
                    {message && (
                        <div className={`message ${messageType}`}>
                            {message}
                        </div>
                    )}

                </>
            )}


            {/* Optional: Section for displaying past lottery results */}
            {/* <div className="section">
              <h2>Kết quả các kỳ trước</h2>
              {/* Logic to display a list of past results */}
              {/* <p>Chức năng này sẽ được cập nhật sau.</p>
            </div> */}
        </div>
    );
}

export default Home;
