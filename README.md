## 🛠️ Cài đặt và Chạy Dự án Cục bộ
## Sau khi git clone dự án về máy local thì trước tiên chúng ta cần thiết lập lại địa chỉ contract và abi thông qua [remix](https://remix.ethereum.org/)
## Copy file Lottery.sol vào contracts/Lottery.sol
## Sau đó Complie Lottery.sol để có ABI
## Tiếp theo sẽ là phần Deloy , hãy chọn Environment là Injected Provider -Metamask
## sau đó nhấn Deloy và đợi 1 thời gian để có được địa chỉ AddressContract khi bạn cuộn chuột xuống dưới sẽ có phần Deployed Contracts và copy địa chỉ đó dán vào contractAddress: "********" ở file src/constants.js
## sau đó bạn có thể chạy dự án được rồi đấy !!!
## chạy command " npm start"
## dự án sẽ chạy trên [localhost://3000](http://localhost:3000/)
## Chúc các bạn có thể trải nghiệm ứng dụng Xổ Số Phi Tập Trung do Nhóm 4 lớp CS22A Trường Đại Học Đông Á Thực hiện