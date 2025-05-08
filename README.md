
# Learning Weakness Detection System

  ## Mô tả dự án

  Hệ thống backend Node.js giúp phát hiện điểm yếu trong học tập trực tuyến, lưu trữ dữ liệu học sinh, câu hỏi, kiến thức (KC) và lịch sử làm bài. Hệ thống hỗ trợ tự động phát hiện điểm yếu, gợi ý luyện tập, và tích hợp 3 thuật toán chọn kiến thức/câu hỏi: **Random, Thompson Sampling, HDoC**.

  ### Phối hợp các Models
  1. **Domain Model**: Xác định các KC (Knowledge Component) và quan hệ phụ thuộc giữa các KC trong chủ đề (ví dụ: "Tích phân" phụ thuộc "Đạo hàm").
  2. **Student Model**: Theo dõi độ thành thạo của từng học sinh với từng KC dựa trên lịch sử làm bài.
  3. **Bandit Model**: Sử dụng thuật toán (Random, Thompson Sampling, HDoC) để chọn KC hoặc câu hỏi phù hợp với năng lực học sinh.
  4. **Question Selection**: Chọn câu hỏi có độ khó phù hợp với trình độ học sinh.
  5. **Feedback Generator**: Tạo phản hồi cá nhân hóa, ví dụ: "Bạn nên ôn tập lại kiến thức về đạo hàm trước khi tiếp tục với tích phân".

  ### Tính năng nổi bật
  - Phát hiện điểm yếu học tập dựa trên lịch sử làm bài
  - Gợi ý luyện tập/câu hỏi tiếp theo theo 3 thuật toán
  - API RESTful dễ tích hợp frontend
  - Hiệu suất cao, mở rộng tốt, bảo mật dữ liệu
  - Cho phép tùy chỉnh thuật toán, tham số, loại phản hồi

  ---

  ## Danh sách API chính

  ### 1. Knowledge Components (KC)  
  - `GET /api/kcs` — Lấy danh sách tất cả KC
  - `GET /api/kcs/:id` — Lấy thông tin KC theo id
  - `GET /api/kcs/:kcId/questions` — Lấy danh sách câu hỏi thuộc KC
  - `GET /api/kcs/grade/:grade` — Lấy danh sách KC theo lớp (grade)
  - **Tạo mới Knowledge Component (KC):**  
    `POST http://localhost:3000/api/kcs`
    
    Body ví dụ:
    ```json
    {
      "id": 1001,
      "name": "Cộng trừ trong phạm vi 10",
      "description": "Kiến thức toán lớp 2",
      "grade": 2
    }
    ```
    
    > **Lưu ý:**
    > - Nếu bạn gửi trường `grade` khi tạo mới, KC sẽ được gán đúng lớp và có thể lọc bằng API `/api/kcs/grade/{grade}`.
    > - Nếu trường `grade` không xuất hiện trong response, hãy kiểm tra lại schema và dữ liệu trong database. Đảm bảo schema KnowledgeComponent đã có trường `grade` và server đã restart sau khi cập nhật schema.

  ### 2. Questions
  - `GET /api/questions` — Lấy danh sách tất cả câu hỏi
  - `GET /api/questions/:id` — Lấy thông tin câu hỏi theo id

  ### 3. Transaction
  - `POST /api/transactions` — Ghi nhận kết quả làm bài của học sinh

  ### 4. Student Performance & Weakness
  - `GET /api/students/:studentId/performance` — Thống kê hiệu suất học tập, điểm yếu, gợi ý giải pháp
  - `GET /api/students/:studentId/weaknesses` — Trả về các KC yếu và các KC tiền đề liên quan

  ### 5. Domain Model
  - `GET /api/domain/kc-dependencies` — Lấy quan hệ phụ thuộc giữa các KC

  ### 6. Question Recommendation (Bandit Model)
  - `POST /api/students/:studentId/next-question` — Chọn câu hỏi tiếp theo cho học sinh dựa trên thuật toán (truyền vào body: `{ "algorithm": "random" | "thompson" | "hdoc" }`)

  ### 7. Feedback Generator
  - `POST /api/students/:studentId/feedback` — Trả về phản hồi cá nhân hóa dựa trên kết quả trả lời gần nhất

  ---

  ## Cách hoạt động của hệ thống

  1. **Phát hiện điểm yếu**: Hệ thống phân tích lịch sử làm bài, xác định các KC mà học sinh có tỷ lệ đúng thấp (<60%), đồng thời truy vết các KC tiền đề liên quan.
  2. **Gợi ý luyện tập**: Sử dụng Bandit Model để chọn câu hỏi tiếp theo phù hợp với năng lực học sinh, ưu tiên các KC yếu hoặc KC có độ khó phù hợp.
  3. **Sinh phản hồi cá nhân hóa**: Nếu học sinh trả lời sai, hệ thống gợi ý ôn tập lại KC tiền đề hoặc luyện tập thêm về KC đó.

  ---

  ## Thuật toán chọn câu hỏi/KC

  ### 1. Random
  - **Cách hoạt động**: Chọn ngẫu nhiên một câu hỏi thuộc các KC yếu mà học sinh chưa làm.
  - **Ưu điểm**: Đơn giản, dễ triển khai, tránh lặp lại.
  - **Nhược điểm**: Không tối ưu hóa quá trình học, có thể chọn câu hỏi quá dễ hoặc quá khó.

  ### 2. Thompson Sampling
  - **Cách hoạt động**: Ưu tiên chọn KC/câu hỏi mà học sinh có tỷ lệ đúng thấp nhất (ước lượng xác suất thành công thấp nhất).
  - **Ưu điểm**: Tối ưu hóa việc luyện tập vào điểm yếu, giúp học sinh tiến bộ nhanh hơn.
  - **Nhược điểm**: Có thể bỏ qua các KC khác, dễ gây nhàm chán nếu chỉ tập trung vào một KC.

  ### 3. HDoC (History Difficulty-Optimized Choice)
  - **Cách hoạt động**: Chọn câu hỏi có độ khó gần với năng lực hiện tại của học sinh nhất (năng lực = tỷ lệ đúng trung bình).
  - **Ưu điểm**: Cân bằng giữa thử thách và khả năng, giúp học sinh phát triển đều.
  - **Nhược điểm**: Cần dữ liệu về độ khó câu hỏi, có thể không tập trung vào điểm yếu nhất.

  ---

  ## So sánh các thuật toán
  | Thuật toán           | Ưu điểm                                 | Nhược điểm                                 |
  |----------------------|-----------------------------------------|--------------------------------------------|
  | Random               | Đơn giản, tránh lặp lại                 | Không tối ưu hóa quá trình học              |
  | Thompson Sampling    | Tập trung vào điểm yếu, tối ưu luyện tập| Có thể gây nhàm chán, bỏ qua KC khác        |
  | HDoC                 | Cân bằng thử thách, phù hợp năng lực    | Cần dữ liệu độ khó, không tập trung điểm yếu|

  ---

  ## Ví dụ luồng hoạt động
  1. Học viên A làm bài, hệ thống xác định A yếu KC "Tích phân".
  2. Bandit Model chọn câu hỏi về "Tích phân" (ưu tiên theo thuật toán).
  3. Nếu học viên trả lời sai, Feedback Generator gợi ý: "Bạn nên ôn tập lại kiến thức về đạo hàm trước khi tiếp tục với tích phân".

  ---

  ## Khởi động dự án
  1. Cài đặt Node.js, MongoDB hoặc sử dụng MongoDB Atlas.
  2. Cài đặt dependencies: `npm install`
  3. Import dữ liệu: `npm run import-data`
  4. (Nếu cần) Sửa trường kcs cho câu hỏi: `npm run fix-question-kcs`
  5. Chạy server: `npm start`

  ---

  ## Đóng góp & phát triển
  - Có thể mở rộng thêm thuật toán, mô hình học sinh, phản hồi nâng cao.
  - Dễ dàng tích hợp frontend hoặc các hệ thống học tập khác.

  ---


## Danh sách đầy đủ các API endpoint

### 1. Knowledge Components (KC)
- **Lấy danh sách tất cả KC:**  
  `GET http://localhost:3000/api/kcs`
- **Lấy thông tin KC theo id:**  
  `GET http://localhost:3000/api/kcs/{kcId}`
- **Lấy danh sách câu hỏi thuộc KC:**  
  `GET http://localhost:3000/api/kcs/{kcId}/questions`
- **Lấy danh sách KC theo lớp (grade):**  
  `GET http://localhost:3000/api/kcs/grade/{grade}`
  
  > **Lưu ý:**
  > - Trường `grade` (kiểu số) trong KnowledgeComponent dùng để phân loại KC theo lớp (ví dụ: 2, 3, 4,...).
  > - Khi tạo mới hoặc cập nhật KnowledgeComponent, thêm trường `grade` vào body để gán KC cho lớp tương ứng.
  > - Ví dụ tạo mới KC cho lớp 2:
  >   ```json
  >   {
  >     "id": 101,
  >     "name": "Cộng trừ trong phạm vi 10",
  >     "description": "Kiến thức toán lớp 2",
  >     "grade": 2
  >   }
  >   ```

### 2. Questions
- **Lấy danh sách tất cả câu hỏi:**  
  `GET http://localhost:3000/api/questions`
- **Lấy thông tin câu hỏi theo id:**  
  `GET http://localhost:3000/api/questions/{questionId}`

### 3. Transaction
- **Ghi nhận kết quả làm bài của học sinh:**  
  `POST http://localhost:3000/api/transactions`
  
  Body ví dụ:
  ```json
  {
    "user_id": "student123",
    "question_id": 1,
    "correct": true,
    "time_taken": 30
  }
  ```
- **Lấy toàn bộ transaction:**  
  `GET http://localhost:3000/api/transactions`
- **Lấy toàn bộ transaction của một học sinh:**  
  `GET http://localhost:3000/api/students/{studentId}/transactions`

### 4. Student Performance & Weakness
- **Thống kê hiệu suất học tập, điểm yếu, gợi ý giải pháp:**  
  `GET http://localhost:3000/api/students/{studentId}/performance`
- **Trả về các KC yếu và các KC tiền đề liên quan:**  
  `GET http://localhost:3000/api/students/{studentId}/weaknesses`

### 5. Domain Model
- **Lấy quan hệ phụ thuộc giữa các KC:**  
  `GET http://localhost:3000/api/domain/kc-dependencies`

### 6. Question Recommendation (Bandit Model)
- **Chọn câu hỏi tiếp theo cho học sinh dựa trên thuật toán:**  
  `POST http://localhost:3000/api/students/{studentId}/next-question`
  
  Body ví dụ:
  ```json
  { "algorithm": "random" }
  ```
  hoặc
  ```json
  { "algorithm": "thompson" }
  ```
  hoặc
  ```json
  { "algorithm": "hdoc" }
  ```

### 7. Feedback Generator
- **Trả về phản hồi cá nhân hóa dựa trên kết quả trả lời gần nhất:**  
  `POST http://localhost:3000/api/students/{studentId}/feedback` 
=======
