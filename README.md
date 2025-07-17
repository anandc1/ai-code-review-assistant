# AI Code Review Assistant

An intelligent code review tool that uses AI to analyze code quality, suggest improvements, detect potential bugs, and provide security recommendations.

## Features

- **Code Quality Analysis**: Comprehensive analysis of code structure, readability, and best practices
- **Bug Detection**: AI-powered identification of potential bugs and logical errors
- **Security Vulnerability Scanning**: Detection of common security issues and vulnerabilities
- **Performance Optimization**: Suggestions for improving code performance and efficiency
- **Code Style Recommendations**: Enforcement of coding standards and style guidelines
- **Multi-Language Support**: Support for Python, JavaScript, TypeScript, Java, and more
- **Detailed Reports**: Comprehensive review reports with severity levels and fix suggestions
- **Diff Analysis**: Review code changes and pull request diffs

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI, Python
- **AI/ML**: OpenAI GPT-4 API, Code Analysis Models
- **Code Processing**: AST parsing, syntax highlighting
- **Deployment**: Fly.io (backend), Vercel (frontend)

## Setup Instructions

### Backend Setup
```bash
cd backend
poetry install
poetry run fastapi dev app/main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create `.env` files in both backend and frontend directories:

**Backend (.env)**:
```
OPENAI_API_KEY=your_openai_api_key_here
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:8000
```

## API Endpoints

- `POST /analyze-code` - Analyze code quality and detect issues
- `POST /review-diff` - Review code changes and diffs
- `POST /security-scan` - Perform security vulnerability analysis
- `POST /performance-check` - Analyze code performance
- `GET /supported-languages` - Get list of supported programming languages

## Supported Languages

- Python
- JavaScript/TypeScript
- Java
- C/C++
- Go
- Rust
- PHP
- Ruby

## Demo

[Live Demo](https://your-deployed-app-url.com)

## Screenshots

![Code Analysis Interface](screenshots/analysis.png)
![Review Results](screenshots/results.png)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Author

Created by **Anand Chunduri** - [GitHub](https://github.com/anandc1)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
