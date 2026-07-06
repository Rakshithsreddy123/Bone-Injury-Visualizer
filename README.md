# 🦴 Bone Injury Visualizer

An **AI-powered medical visualization system** that analyzes MRI reports (PDF, TXT, or direct text input) and generates an interactive **3D skeletal visualization** of bone injuries. The application highlights affected bones, visualizes injury severity using color-coded indicators, and provides separate **Patient** and **Doctor** views for improved understanding.

---

## ✨ Features

- 📄 Upload MRI reports in **PDF** or **TXT** format
- ✍️ Direct text input support
- 🤖 AI-powered report analysis
- 🦴 Interactive 3D skeletal visualization
- 🎨 Color-coded injury severity highlighting
- 👨‍⚕️ Dedicated Doctor View with extracted findings
- 👤 Simplified Patient View with easy-to-understand explanations
- 📍 Automatic bone localization and injury mapping

---

## 🎯 Objectives

- Simplify interpretation of MRI reports
- Visualize bone injuries on a 3D skeletal model
- Improve patient understanding through simplified summaries
- Assist healthcare professionals with structured injury information
- Bridge the gap between textual reports and medical visualization

---

## 🛠️ Tech Stack

- ⚛️ React.js
- ⚡ Vite
- 🟢 Node.js
- 🐍 Python (Backend)
- 🦴 Three.js / React Three Fiber
- 🤖 NLP / LLM-based Report Analysis
- 📄 PDF Processing

---

## 📁 Project Structure

```text
bone-injury-visualizer/
│── assets/
│── backend/
│── frontend/
│── README.md
```

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/Rakshithsreddy123/bone-injury-visualizer.git
```

### Navigate to the Project

```bash
cd bone-injury-visualizer
```

### Install Frontend Dependencies

```bash
cd frontend
npm install
npm run dev
```

### Start Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

---

## 📸 Screenshots

### 📄 Home Page

The interface which includes a skeletal display model and has input options to either upload documents(.pdf or .txt) or the raw text.

<p align="center">
  <img width="700" height="400" alt="Screenshot 2026-07-06 191738" src="https://github.com/user-attachments/assets/8c6c04c5-c881-40a1-8ca0-e6621a1631d3" />
</p>

---

### 🦴 Patient View

The patient dashboard displays a simplified explanation of the injury along with a color-coded 3D visualization of the affected bone.

<p align="center">
  <img width="700" height="400" alt="Screenshot 2026-07-06 191958" src="https://github.com/user-attachments/assets/0d9e95bb-b7eb-49eb-b16a-0c211f2d49bd" />
</p>

---

### 👨‍⚕️ Doctor View

The doctor dashboard presents extracted clinical findings, highlighted bones, injury severity, and the original report for detailed medical assessment.

<p align="center">
  <img width="700" height="400" alt="Screenshot 2026-07-06 192020" src="https://github.com/user-attachments/assets/1e635865-ba2a-4671-aa2d-b657b28121d9" />
</p>

---

## 📊 Output

The system analyzes the uploaded MRI report, identifies the injured bone, determines the severity of the injury, visualizes the affected region on a 3D skeletal model, and generates customized outputs for both patients and healthcare professionals.

---

## 🔮 Future Enhancements

- 🧠 Support for multiple imaging modalities (CT, X-Ray, MRI)
- 🤖 Enhanced AI-based injury localization
- 📈 3D animation of injury progression
- ☁️ Cloud deployment
- 🏥 Hospital Information System integration
- 📱 Mobile-friendly interface

---

## ✅ Conclusion

The **Bone Injury Visualizer** combines AI-powered medical report analysis with interactive 3D visualization to improve the interpretation of MRI reports. By providing separate patient and doctor interfaces, the system enhances communication, supports clinical decision-making, and makes complex medical information easier to understand.

---

## 👨‍💻 Author

**Rakshith S**

- 💼 LinkedIn: https://www.linkedin.com/in/rakshith-s-190286291
- 🐙 GitHub: https://github.com/Rakshithsreddy123

---

⭐ If you found this project useful, consider giving it a **Star** on GitHub!
