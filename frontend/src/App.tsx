import { useState } from 'react'
import { Code, Shield, Zap, Bug, FileText, Upload, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface AnalysisResult {
  language: string
  analysis_type: string
  static_issues: Array<{
    type: string
    severity: string
    line?: number
    message: string
    suggestion?: string
  }>
  ai_analysis: string
  overall_score: number
  total_issues: number
}

interface DiffReviewResult {
  language: string
  review: string
  change_type: string
}

interface SecurityScanResult {
  language: string
  security_analysis: string
  scan_type: string
}

interface PerformanceResult {
  language: string
  performance_analysis: string
  analysis_type: string
}

function App() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('')
  const [analysisType, setAnalysisType] = useState('quality')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | DiffReviewResult | SecurityScanResult | PerformanceResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('analyze')
  
  const [oldCode, setOldCode] = useState('')
  const [newCode, setNewCode] = useState('')

  const supportedLanguages = [
    'python', 'javascript', 'typescript', 'java', 'cpp', 'c', 
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'csharp'
  ]

  const analysisTypes = [
    { value: 'quality', label: 'Code Quality', icon: Code },
    { value: 'bugs', label: 'Bug Detection', icon: Bug },
    { value: 'security', label: 'Security Scan', icon: Shield },
    { value: 'performance', label: 'Performance', icon: Zap },
    { value: 'style', label: 'Code Style', icon: FileText }
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const endpoint = analysisType === 'security' ? '/security-scan' : 
                     analysisType === 'performance' ? '/performance-check' : 
                     '/analyze-code'

      const requestBody = analysisType === 'security' || analysisType === 'performance' 
        ? { code, language: language || undefined }
        : { code, language: language || undefined, analysis_type: analysisType }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze code')
      }

      const result = await response.json()
      setResult(result)
      setActiveTab('results')
    } catch (err) {
      setError('Failed to analyze code. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const reviewDiff = async () => {
    if (!oldCode.trim() || !newCode.trim()) {
      setError('Please provide both old and new code for comparison')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/review-diff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_code: oldCode,
          new_code: newCode,
          language: language || undefined
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to review diff')
      }

      const result = await response.json()
      setResult(result)
      setActiveTab('results')
    } catch (err) {
      setError('Failed to review diff. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const renderAnalysisResult = (result: AnalysisResult) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analysis Results</h3>
          <p className="text-sm text-gray-600">
            Language: {result.language} | Type: {result.analysis_type}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getScoreColor(result.overall_score)}`}>
            {result.overall_score}/100
          </div>
          <p className="text-sm text-gray-600">Overall Score</p>
        </div>
      </div>

      {result.static_issues && result.static_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Static Analysis Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.static_issues.map((issue, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getSeverityColor(issue.severity)}>
                    {issue.severity.toUpperCase()}
                  </Badge>
                  {issue.line && (
                    <span className="text-sm text-gray-500">Line {issue.line}</span>
                  )}
                </div>
                <p className="text-sm font-medium mb-1">{issue.message}</p>
                {issue.suggestion && (
                  <p className="text-sm text-gray-600">{issue.suggestion}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {result.ai_analysis}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderOtherResult = (result: DiffReviewResult | SecurityScanResult | PerformanceResult) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {'review' in result ? 'Diff Review' : 
           'security_analysis' in result ? 'Security Analysis' : 'Performance Analysis'}
        </CardTitle>
        <CardDescription>
          Language: {result.language}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {'review' in result ? result.review :
             'security_analysis' in result ? result.security_analysis :
             'performance_analysis' in result ? result.performance_analysis : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Code className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">AI Code Review Assistant</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Intelligent code analysis powered by AI to improve code quality, detect bugs, and enhance security
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyze">Code Analysis</TabsTrigger>
            <TabsTrigger value="diff">Diff Review</TabsTrigger>
            <TabsTrigger value="results" disabled={!result}>Results</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Code Input</CardTitle>
                    <CardDescription>
                      Paste your code below for AI-powered analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Paste your code here..."
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Analysis Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Language (Optional)</label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-detect" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Auto-detect</SelectItem>
                          {supportedLanguages.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Analysis Type</label>
                      <div className="space-y-2">
                        {analysisTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <Button
                              key={type.value}
                              variant={analysisType === type.value ? "default" : "outline"}
                              className="w-full justify-start"
                              onClick={() => setAnalysisType(type.value)}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {type.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={analyzeCode}
                      disabled={!code.trim() || isAnalyzing}
                      className="w-full"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Code className="mr-2 h-4 w-4" />
                          Analyze Code
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="diff" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Old Code</CardTitle>
                  <CardDescription>Original version of the code</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste the original code here..."
                    value={oldCode}
                    onChange={(e) => setOldCode(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Code</CardTitle>
                  <CardDescription>Updated version of the code</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste the updated code here..."
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={reviewDiff}
                disabled={!oldCode.trim() || !newCode.trim() || isAnalyzing}
                size="lg"
                className="px-8"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Review Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results">
            {result && (
              <div className="space-y-6">
                {'static_issues' in result ? 
                  renderAnalysisResult(result as AnalysisResult) : 
                  renderOtherResult(result as DiffReviewResult | SecurityScanResult | PerformanceResult)
                }
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('analyze')
                      setResult(null)
                    }}
                  >
                    New Analysis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('diff')
                      setResult(null)
                    }}
                  >
                    Review Diff
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12 text-gray-500">
          <p>Built with React, FastAPI, and OpenAI GPT-4</p>
        </div>
      </div>
    </div>
  )
}

export default App
