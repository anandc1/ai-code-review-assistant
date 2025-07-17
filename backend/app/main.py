from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import ast
import re
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from pygments import highlight
from pygments.lexers import get_lexer_by_name, guess_lexer

load_dotenv()

app = FastAPI(title="AI Code Review Assistant", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class CodeAnalysisRequest(BaseModel):
    code: str
    language: Optional[str] = None
    analysis_type: str  # "quality", "bugs", "security", "performance", "style"

class DiffReviewRequest(BaseModel):
    old_code: str
    new_code: str
    language: Optional[str] = None

class CodeIssue(BaseModel):
    type: str
    severity: str  # "low", "medium", "high", "critical"
    line: Optional[int]
    message: str
    suggestion: Optional[str]

class AnalysisResult(BaseModel):
    issues: List[CodeIssue]
    overall_score: int  # 0-100
    summary: str
    suggestions: List[str]

SUPPORTED_LANGUAGES = [
    "python", "javascript", "typescript", "java", "cpp", "c", 
    "go", "rust", "php", "ruby", "swift", "kotlin", "csharp"
]

def detect_language(code: str, language_hint: Optional[str] = None) -> str:
    """Detect programming language from code"""
    if language_hint and language_hint.lower() in SUPPORTED_LANGUAGES:
        return language_hint.lower()
    
    try:
        lexer = guess_lexer(code)
        detected = lexer.name.lower()
        
        language_mapping = {
            "python": "python",
            "javascript": "javascript",
            "typescript": "typescript",
            "java": "java",
            "c++": "cpp",
            "c": "c",
            "go": "go",
            "rust": "rust",
            "php": "php",
            "ruby": "ruby",
            "swift": "swift",
            "kotlin": "kotlin",
            "c#": "csharp"
        }
        
        for key, value in language_mapping.items():
            if key in detected:
                return value
                
        return "unknown"
    except:
        return "unknown"

def analyze_python_ast(code: str) -> List[Dict[str, Any]]:
    """Analyze Python code using AST"""
    issues = []
    try:
        tree = ast.parse(code)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if len(node.args.args) > 5:
                    issues.append({
                        "type": "complexity",
                        "severity": "medium",
                        "line": node.lineno,
                        "message": f"Function '{node.name}' has too many parameters ({len(node.args.args)})",
                        "suggestion": "Consider using a configuration object or breaking down the function"
                    })
                
                if not ast.get_docstring(node):
                    issues.append({
                        "type": "documentation",
                        "severity": "low",
                        "line": node.lineno,
                        "message": f"Function '{node.name}' is missing a docstring",
                        "suggestion": "Add a docstring to document the function's purpose and parameters"
                    })
            
            elif isinstance(node, ast.ExceptHandler):
                if node.type is None:
                    issues.append({
                        "type": "error_handling",
                        "severity": "high",
                        "line": node.lineno,
                        "message": "Bare except clause catches all exceptions",
                        "suggestion": "Specify the exception type or use 'except Exception:' instead"
                    })
    
    except SyntaxError as e:
        issues.append({
            "type": "syntax",
            "severity": "critical",
            "line": e.lineno,
            "message": f"Syntax error: {e.msg}",
            "suggestion": "Fix the syntax error before proceeding"
        })
    
    return issues

@app.get("/")
def read_root():
    return {"message": "AI Code Review Assistant API", "version": "1.0.0"}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/supported-languages")
def get_supported_languages():
    return {"languages": SUPPORTED_LANGUAGES}

@app.post("/analyze-code")
async def analyze_code(request: CodeAnalysisRequest):
    try:
        language = detect_language(request.code, request.language)
        
        static_issues = []
        if language == "python":
            static_issues = analyze_python_ast(request.code)
        
        analysis_prompts = {
            "quality": "Analyze this code for overall quality, readability, maintainability, and adherence to best practices. Focus on code structure, naming conventions, and design patterns.",
            "bugs": "Carefully examine this code for potential bugs, logical errors, edge cases, and runtime issues. Look for null pointer exceptions, array bounds, infinite loops, and other common programming errors.",
            "security": "Perform a security analysis of this code. Look for vulnerabilities such as SQL injection, XSS, buffer overflows, insecure data handling, authentication issues, and other security concerns.",
            "performance": "Analyze this code for performance issues and optimization opportunities. Look for inefficient algorithms, memory leaks, unnecessary computations, and suggest improvements.",
            "style": "Review this code for style and formatting issues. Check adherence to coding standards, consistent naming, proper indentation, and code organization."
        }
        
        if request.analysis_type not in analysis_prompts:
            raise HTTPException(status_code=400, detail="Invalid analysis type")
        
        prompt = f"""
        {analysis_prompts[request.analysis_type]}
        
        Programming Language: {language}
        
        Code to analyze:
        ```{language}
        {request.code}
        ```
        
        Please provide:
        1. A list of specific issues found (with line numbers if possible)
        2. Severity level for each issue (critical, high, medium, low)
        3. Specific suggestions for improvement
        4. An overall quality score (0-100)
        5. A brief summary of the code's condition
        
        Format your response clearly with sections for each type of finding.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization. Provide detailed, actionable feedback."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        ai_analysis = response.choices[0].message.content
        
        all_issues = static_issues.copy()
        
        critical_count = len([i for i in all_issues if i.get("severity") == "critical"])
        high_count = len([i for i in all_issues if i.get("severity") == "high"])
        medium_count = len([i for i in all_issues if i.get("severity") == "medium"])
        
        overall_score = max(0, 100 - (critical_count * 25) - (high_count * 10) - (medium_count * 5))
        
        return {
            "language": language,
            "analysis_type": request.analysis_type,
            "static_issues": static_issues,
            "ai_analysis": ai_analysis,
            "overall_score": overall_score,
            "total_issues": len(all_issues)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing code: {str(e)}")

@app.post("/review-diff")
async def review_diff(request: DiffReviewRequest):
    try:
        language = detect_language(request.new_code, request.language)
        
        prompt = f"""
        Review the following code changes and provide feedback on:
        1. What was changed and why it might have been changed
        2. Potential issues introduced by the changes
        3. Improvements made by the changes
        4. Suggestions for further improvement
        5. Overall assessment of the change quality
        
        Programming Language: {language}
        
        OLD CODE:
        ```{language}
        {request.old_code}
        ```
        
        NEW CODE:
        ```{language}
        {request.new_code}
        ```
        
        Provide a detailed review focusing on the differences between the old and new code.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert code reviewer specializing in change analysis and pull request reviews. Focus on the impact and quality of code changes."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.3
        )
        
        return {
            "language": language,
            "review": response.choices[0].message.content,
            "change_type": "modification"  # Could be enhanced to detect add/delete/modify
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reviewing diff: {str(e)}")

@app.post("/security-scan")
async def security_scan(request: CodeAnalysisRequest):
    try:
        language = detect_language(request.code, request.language)
        
        prompt = f"""
        Perform a comprehensive security analysis of this code. Look for:
        
        1. Input validation issues
        2. SQL injection vulnerabilities
        3. Cross-site scripting (XSS) vulnerabilities
        4. Authentication and authorization flaws
        5. Insecure data storage or transmission
        6. Buffer overflows and memory safety issues
        7. Cryptographic weaknesses
        8. Information disclosure vulnerabilities
        9. Business logic flaws
        10. Dependency vulnerabilities
        
        Programming Language: {language}
        
        Code to analyze:
        ```{language}
        {request.code}
        ```
        
        For each vulnerability found, provide:
        - Vulnerability type and description
        - Severity level (Critical, High, Medium, Low)
        - Specific location in code (line numbers if possible)
        - Potential impact
        - Remediation steps
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert specializing in secure code review and vulnerability assessment. Provide detailed security analysis with actionable remediation steps."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.2
        )
        
        return {
            "language": language,
            "security_analysis": response.choices[0].message.content,
            "scan_type": "comprehensive"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing security scan: {str(e)}")

@app.post("/performance-check")
async def performance_check(request: CodeAnalysisRequest):
    try:
        language = detect_language(request.code, request.language)
        
        prompt = f"""
        Analyze this code for performance issues and optimization opportunities:
        
        1. Algorithm efficiency and time complexity
        2. Memory usage and space complexity
        3. Database query optimization
        4. Loop optimization
        5. Caching opportunities
        6. Unnecessary computations
        7. Resource management
        8. Concurrency and parallelization opportunities
        9. I/O optimization
        10. Language-specific performance patterns
        
        Programming Language: {language}
        
        Code to analyze:
        ```{language}
        {request.code}
        ```
        
        For each performance issue found, provide:
        - Issue description and impact
        - Current time/space complexity
        - Suggested optimization
        - Expected improvement
        - Implementation difficulty
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a performance optimization expert with deep knowledge of algorithms, data structures, and system performance. Provide specific, actionable optimization recommendations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1800,
            temperature=0.3
        )
        
        return {
            "language": language,
            "performance_analysis": response.choices[0].message.content,
            "analysis_type": "performance"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing performance check: {str(e)}")
