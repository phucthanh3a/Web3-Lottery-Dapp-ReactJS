import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import constants from './constants'; // Ensure constants.js exists with contractAddress and contractAbi

function PickWinner() {
  // State variables
  const [currentAccount, setCurrentAccount] = useState('');
  const [contractInstance, setContractInstance] = useState(null); // Initialize as null
  const [isOwner, setIsOwner] = useState(false); // Use isOwner for clarity
  const [lotteryComplete, setLotteryComplete] = useState(false); // Use lotteryComplete for clarity
  const [winnerInfo, setWinnerInfo] = useState({ // State for winner details
    address: 'N/A',
    amount: 'N/A', // Prize amount
  });
   const [message, setMessage] = useState(''); // State for displaying messages
   const [messageType, setMessageType] = useState(''); // 'success' or 'error' for message styling

   // State to hold the provider instance
   const [provider, setProvider] = useState(null);


  // Effect to load blockchain data and set up event listeners on component mount
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
            console.log("Connected account (PickWinner):", address);
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
                     setIsOwner(false);
                     setLotteryComplete(false);
                     setWinnerInfo({ address: 'N/A', amount: 'N/A' });
                 }
            });

             // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                console.log("Chain changed (PickWinner):", chainId);
                window.location.reload();
            });


        } catch (err) {
          console.error("Error loading blockchain data (PickWinner):", err);
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

  // Effect to load contract data and check owner status when currentAccount or provider changes
   useEffect(() => {
      if (currentAccount && provider) { // Ensure both are available
           loadContractData(currentAccount, provider);
      }
   }, [currentAccount, provider]); // Effect runs when currentAccount or provider changes


  const loadContractData = async (account, currentProvider) => {
      // Ensure provider is available
      if (!currentProvider) return;
      try {
          const signer = currentProvider.getSigner();
          // Create a new contract instance with the signer
          const contractIns = new ethers.Contract(constants.contractAddress, constants.contractAbi, signer);
          setContractInstance(contractIns);

          // Check if the current account is the contract owner (manager)
          // Using getManager() as per your contract ABI
          const ownerAddress = await contractIns.getManager();
          setIsOwner(account.toLowerCase() === ownerAddress.toLowerCase());
          console.log("Is Owner:", account.toLowerCase() === ownerAddress.toLowerCase());

          // Fetch the completion status of the lottery using isComplete() as per ABI
          const complete = await contractIns.isComplete();
          setLotteryComplete(complete);

          // Fetch winner information if the lottery is complete
          if (complete) {
              try {
                  // Using getWinner() as per ABI
                  const winner = await contractIns.getWinner();
                   // Fetch the contract balance to get the prize amount
                   const winningAmountWei = await currentProvider.getBalance(constants.contractAddress);
                   const winningAmountEth = ethers.utils.formatEther(winningAmountWei); // Convert from Wei to ETH

                  setWinnerInfo({
                      address: winner,
                      amount: winningAmountEth,
                  });
              } catch (infoErr) {
                  console.warn("Could not fetch winner info:", infoErr);
                   setWinnerInfo({ address: 'Chưa xác định', amount: 'N/A' });
              }
          } else {
             // Reset winner info if lottery is not complete
             setWinnerInfo({ address: 'Chưa quay thưởng', amount: 'N/A' });
          }


      } catch (error) {
          console.error("Error fetching contract state (PickWinner):", error);
           setMessage('Lỗi khi tải dữ liệu hợp đồng.');
           setMessageType('error');
      }
  };


  const pickWinner = async () => {
    // Check conditions before picking winner
    if (!contractInstance || !currentAccount || !isOwner || lotteryComplete) {
        setMessage('Không thể quay thưởng. Vui lòng kiểm tra quyền hạn hoặc trạng thái xổ số.');
        setMessageType('error');
      return;
    }

    setMessage('Đang gửi giao dịch quay thưởng...');
    setMessageType('');
    try {
      // Call the pickWinner function on the smart contract
      // Using pickWinner() as per your contract ABI
      const tx = await contractInstance.pickWinner();
      await tx.wait(); // Wait for the transaction to be mined
      setMessage('Đã chọn người thắng thành công!');
      setMessageType('success');
      // Reload contract data to update winner info after picking
      await loadContractData(currentAccount, provider);
    } catch (error) {
      console.error("Pick winner failed:", error);
       // Display specific error message if available
       setMessage(`Quay thưởng thất bại: ${error.reason || error.message}`);
       setMessageType('error');
    }
  };

  // Function to withdraw owner fees (if applicable)
   const withdrawOwnerFees = async () => {
       // Check conditions before withdrawing fees
       if (!contractInstance || !currentAccount || !isOwner) {
           setMessage('Không thể rút tiền lãi. Bạn không phải chủ sở hữu.');
           setMessageType('error');
           return;
       }
       // Assuming your contract has a function called withdrawOwnerFees()
       // NOTE: Your current Lottery.sol does NOT have a withdrawOwnerFees function.
       // This code will only work if you add that function to your contract.
       setMessage('Đang gửi giao dịch rút tiền lãi...');
       setMessageType('');
       try {
           // Example call - uncomment and ensure function exists in contract
           // const tx = await contractInstance.withdrawOwnerFees();
           // await tx.wait(); // Wait for the transaction to be mined
           setMessage('Chức năng rút tiền lãi chưa được triển khai trong hợp đồng.'); // Inform user if function is missing
           setMessageType('error');
           // setMessage('Đã rút tiền lãi thành công!');
           // setMessageType('success');
           // Optional: Reload data or update balance display if needed
       } catch (error) {
           console.error("Withdraw fees failed:", error);
            // Display specific error message if available
            setMessage(`Rút tiền lãi thất bại: ${error.reason || error.message}`);
            setMessageType('error');
       }
   };


  return (
    <div className="container">
      <h1>Trang Quản lý Xổ số</h1>

       {/* Section to prompt user to connect wallet if not connected */}
       {!currentAccount && (
           <div className="section">
               <h2>Kết nối ví</h2>
               <p>Vui lòng kết nối ví MetaMask để truy cập các chức năng quản trị.</p>
               {/* The connect wallet logic is handled by the useEffect on mount */}
           </div>
       )}

      {/* Display content only if a wallet is connected */}
      {currentAccount && (
          <>
            {/* Section displaying connected wallet info and owner status */}
            <div className="section">
               <h2>Thông tin tài khoản</h2>
               <p>Ví đã kết nối: <strong>{currentAccount}</strong></p>
               {isOwner ? (
                   <p className="message success">Quyền hạn: <strong>Chủ sở hữu hợp đồng</strong></p>
               ) : (
                    <p className="message error">Quyền hạn: <strong>Bạn là người chơi thông thường nên không thể truy cập chức năng này</strong></p>
               )}
            </div>

            {/* Display owner-specific sections only if the connected account is the owner */}
            {isOwner && (
              <>
                  {/* Section displaying lottery status */}
                  <div className="section">
                    <h2>Trạng thái Xổ số</h2>
                    <p>Địa chỉ hợp đồng: <strong>{constants.contractAddress}</strong></p>
                    <p>Trạng thái: <strong>{lotteryComplete ? 'Đã hoàn thành' : 'Đang mở'}</strong></p>
                  </div>

                  {/* Section for picking the winner */}
                  <div className="section">
                    <h2>Quay thưởng</h2>
                    {lotteryComplete ? (
                        <p>Kỳ xổ số hiện tại đã hoàn thành. Vui lòng triển khai kỳ mới để quay thưởng.</p>
                    ) : (
                      <>
                          <p>Nhấn nút dưới đây để chọn ngẫu nhiên một người tham gia làm người thắng cuộc.</p>
                          <div className="button-container">
                             {/* Button to trigger picking winner */}
                             <button className="claim-button" onClick={pickWinner} disabled={!contractInstance || lotteryComplete}>
                                Quay thưởng ngay!
                             </button>
                          </div>
                      </>
                    )}
                  </div>

                  {/* Section displaying the result of the last lottery */}
                  <div className="section">
                     <h2>Kết quả Kỳ gần nhất</h2>
                     {lotteryComplete ? (
                         <>
                            <p>Người thắng: <strong>{winnerInfo.address}</strong></p>
                            <p>Số tiền thắng: <strong>{winnerInfo.amount} ETH</strong></p> {/* Adjust unit if necessary */}
                            {/* Optional: Add transaction link here */}
                         </>
                     ) : (
                         <p>Kỳ xổ số chưa hoàn thành hoặc chưa quay thưởng.</p>
                     )}
                  </div>

                  {/* Optional: Section for withdrawing owner fees */}
                   {/* NOTE: This section is commented out because your contract does not have withdrawOwnerFees */}
                   {/* <div className="section">
                      <h2>Quản lý tiền lãi</h2>
                      <p>Rút tiền lãi của chủ hợp đồng (nếu có).</p>
                       <div className="button-container">
                          <button onClick={withdrawOwnerFees} disabled={!contractInstance}>Rút tiền lãi</button>
                       </div>
                   </div> */}
              </>
            )}

            {/* Display message if user is not the owner */}
            {!isOwner && (
                 <div className="section">
                    <p>Bạn không có quyền truy cập các chức năng quản trị của trang này.</p>
                 </div>
            )}

             {/* Display general messages (success/error) */}
             {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}

          </>
      )}

    </div>
  );
}

export default PickWinner;
