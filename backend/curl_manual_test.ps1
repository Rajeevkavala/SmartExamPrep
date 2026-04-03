Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location "d:\New folder (2)\SmartExamPrep"

if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      if (-not $name.StartsWith("#")) {
        Set-Item -Path "Env:$name" -Value $value
      }
    }
  }
}

$BASE_URL = $env:NEXT_PUBLIC_API_URL
if (-not $BASE_URL) { $BASE_URL = "http://127.0.0.1:8000" }
$BASE_URL = $BASE_URL.TrimEnd("/")

$results = @()

function Invoke-Curl {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [string]$FormFilePath = "",
    [string]$FormFieldName = "file"
  )

  $tmp = [System.IO.Path]::GetTempFileName()
  $bodyFile = ""
  $args = @("-sS", "-o", $tmp, "-w", "%{http_code}", "-X", $Method, $Url)

  foreach ($key in $Headers.Keys) {
    $args += @("-H", "${key}: $($Headers[$key])")
  }

  if ($Body) {
    $bodyFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $bodyFile -Value $Body -Encoding utf8 -NoNewline
    $args += @("--data-binary", "@$bodyFile")
  }

  if ($FormFilePath) {
    $args += @("-F", "$FormFieldName=@$FormFilePath")
  }

  $status = & curl.exe @args
  $bodyText = Get-Content $tmp -Raw
  Remove-Item $tmp -Force
  if ($bodyFile -and (Test-Path $bodyFile)) {
    Remove-Item $bodyFile -Force
  }

  return [pscustomobject]@{
    Status = [int]$status
    Body = $bodyText
  }
}

function Add-Result {
  param([string]$Api, $Res)
  $preview = ($Res.Body -replace "`r|`n", " ").Trim()
  if ($preview.Length -gt 140) { $preview = $preview.Substring(0, 140) + "..." }
  $script:results += [pscustomobject]@{
    API = $Api
    Status = $Res.Status
    Preview = $preview
  }
}

function Try-GetJson {
  param([string]$Raw)
  try {
    return ($Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

# Health
$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/health"
Add-Result "GET /health" $r

# Student setup
$suffix = [Guid]::NewGuid().ToString("N").Substring(0,8)
$studentEmail = "curl.student.$suffix@smartexamprep.com"
$studentPassword = "Student@123"

$registerBody = @{ email = $studentEmail; password = $studentPassword; full_name = "Curl Student" } | ConvertTo-Json -Compress
$r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/auth/register" -Headers @{ "Content-Type" = "application/json" } -Body $registerBody
Add-Result "POST /api/auth/register" $r

$studentLoginBody = @{ email = $studentEmail; password = $studentPassword } | ConvertTo-Json -Compress
$r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/auth/login" -Headers @{ "Content-Type" = "application/json" } -Body $studentLoginBody
Add-Result "POST /api/auth/login (student)" $r

$studentToken = ""
$studentLoginJson = Try-GetJson -Raw $r.Body
if ($null -ne $studentLoginJson -and $studentLoginJson.PSObject.Properties.Name -contains "access_token") {
  $studentToken = [string]$studentLoginJson.access_token
}
$studentAuth = @{}
if ($studentToken) {
  $studentAuth = @{ "Authorization" = "Bearer $studentToken" }
}

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/auth/me" -Headers $studentAuth
Add-Result "GET /api/auth/me" $r

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/content/subjects" -Headers $studentAuth
Add-Result "GET /api/content/subjects" $r

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/quiz/diagnostic" -Headers $studentAuth
Add-Result "GET /api/quiz/diagnostic" $r

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/quiz/adaptive" -Headers $studentAuth
Add-Result "GET /api/quiz/adaptive" $r

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/analysis/weakness" -Headers $studentAuth
Add-Result "GET /api/analysis/weakness" $r

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/analysis/dashboard" -Headers $studentAuth
Add-Result "GET /api/analysis/dashboard" $r

$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/revision/plan" -Headers $studentAuth
Add-Result "GET /api/revision/plan" $r

$r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/revision/mark-done" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $studentToken" } -Body '{"topic_id":"00000000-0000-0000-0000-000000000000"}'
Add-Result "POST /api/revision/mark-done" $r

$r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/ai/explain" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $studentToken" } -Body '{"topic_id":"00000000-0000-0000-0000-000000000000"}'
Add-Result "POST /api/ai/explain" $r

# Admin login
$adminToken = ""
foreach ($adminCandidate in @(
  @{ email = "chunk07-admin-test@smartexamprep.com"; password = "Admin@1234"; label = "primary" },
  @{ email = "admin@smartexamprep.com"; password = "Admin@1234"; label = "fallback" }
)) {
  if ($adminToken) { break }
  $adminLoginBody = @{ email = $adminCandidate.email; password = $adminCandidate.password } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/auth/login" -Headers @{ "Content-Type" = "application/json" } -Body $adminLoginBody
  Add-Result ("POST /api/auth/login (admin " + $adminCandidate.label + ")") $r
  $adminJson = Try-GetJson -Raw $r.Body
  if ($null -ne $adminJson -and $adminJson.PSObject.Properties.Name -contains "access_token") {
    $adminToken = [string]$adminJson.access_token
  }
}

$adminAuth = @{}
if ($adminToken) {
  $adminAuth = @{ "Authorization" = "Bearer $adminToken" }
}

# Admin content + topics
$r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/content/subjects" -Headers $adminAuth
Add-Result "GET /api/admin/content/subjects" $r

$subjectId = "00000000-0000-0000-0000-000000000000"
$topicId = "00000000-0000-0000-0000-000000000000"
$questionId = "00000000-0000-0000-0000-000000000000"
$scrapeJobId = "00000000-0000-0000-0000-000000000000"
$uploadId = "00000000-0000-0000-0000-000000000000"

if ($adminToken) {
  $subjectName = "Curl Subject $suffix"
  $createSubjectBody = @{ name = $subjectName; description = "manual curl"; display_order = 2 } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/content/subjects" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body $createSubjectBody
  Add-Result "POST /api/admin/content/subjects" $r
  $subjectJson = Try-GetJson -Raw $r.Body
  if ($null -ne $subjectJson -and $subjectJson.PSObject.Properties.Name -contains "id") { $subjectId = [string]$subjectJson.id }

  $r = Invoke-Curl -Method "PUT" -Url "$BASE_URL/api/admin/content/subjects/$subjectId" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body '{"description":"updated manual curl"}'
  Add-Result "PUT /api/admin/content/subjects/{id}" $r

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/content/subjects/$subjectId/topics" -Headers $adminAuth
  Add-Result "GET /api/admin/content/subjects/{id}/topics" $r

  $topicName = "Curl Topic $suffix"
  $createTopicBody = @{ name = $topicName; subtopics = @("A", "B"); nlp_keyword_tags = @("demo"); display_order = 1; difficulty_weight = 1.1 } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/content/subjects/$subjectId/topics" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body $createTopicBody
  Add-Result "POST /api/admin/content/subjects/{id}/topics" $r
  $topicJson = Try-GetJson -Raw $r.Body
  if ($null -ne $topicJson -and $topicJson.PSObject.Properties.Name -contains "id") { $topicId = [string]$topicJson.id }

  $r = Invoke-Curl -Method "PUT" -Url "$BASE_URL/api/admin/content/topics/$topicId" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body '{"difficulty_weight":1.4}'
  Add-Result "PUT /api/admin/content/topics/{id}" $r

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/content/subjects/$subjectId/topics" -Headers $studentAuth
  Add-Result "GET /api/content/subjects/{id}/topics" $r

  $qText = "Manual curl question $suffix choose right option"
  $createQuestionBody = @{
    subject_id = $subjectId
    topic_id = $topicId
    subtopic = "A"
    question_text = $qText
    options = @("A. one", "B. two", "C. three", "D. four")
    question_image_urls = @()
    correct_answer = "A"
    explanation = "demo"
    difficulty = "easy"
    source_type = "practice"
    year = 2026
  } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/questions/" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body $createQuestionBody
  Add-Result "POST /api/admin/questions/" $r
  $questionJson = Try-GetJson -Raw $r.Body
  if ($null -ne $questionJson -and $questionJson.PSObject.Properties.Name -contains "id") { $questionId = [string]$questionJson.id }

  if ($studentToken -and $questionId -ne "00000000-0000-0000-0000-000000000000") {
    $quizSubmitBody = @{
      quiz_type = "diagnostic"
      answers = @(
        @{
          question_id = $questionId
          selected_answer = "A"
          time_taken_s = 12.5
        }
      )
    } | ConvertTo-Json -Compress
    $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/quiz/submit" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $studentToken" } -Body $quizSubmitBody
    Add-Result "POST /api/quiz/submit" $r
  }

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/questions/?subject_id=$subjectId&topic_id=$topicId&difficulty=easy&source_type=practice&is_verified=true&year=2026&search=Manual&limit=20&offset=0" -Headers $adminAuth
  Add-Result "GET /api/admin/questions/ (filters)" $r

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/questions/$questionId" -Headers $adminAuth
  Add-Result "GET /api/admin/questions/{id}" $r

  $r = Invoke-Curl -Method "PUT" -Url "$BASE_URL/api/admin/questions/$questionId" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body '{"difficulty":"medium","is_verified":false}'
  Add-Result "PUT /api/admin/questions/{id}" $r

  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/questions/$questionId/verify" -Headers $adminAuth
  Add-Result "POST /api/admin/questions/{id}/verify" $r

  $bulkVerifyBody = @{ question_ids = @($questionId) } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/questions/bulk-verify" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body $bulkVerifyBody
  Add-Result "POST /api/admin/questions/bulk-verify" $r

  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/scraper/start" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body '{"url":"https://example.com","notes":"manual curl"}'
  Add-Result "POST /api/admin/scraper/start" $r
  $scrapeJson = Try-GetJson -Raw $r.Body
  if ($null -ne $scrapeJson -and $scrapeJson.PSObject.Properties.Name -contains "job_id") { $scrapeJobId = [string]$scrapeJson.job_id }

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/scraper/jobs?limit=5&offset=0" -Headers $adminAuth
  Add-Result "GET /api/admin/scraper/jobs" $r

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/scraper/jobs/$scrapeJobId" -Headers $adminAuth
  Add-Result "GET /api/admin/scraper/jobs/{id}" $r

  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/scraper/jobs/$scrapeJobId/import" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body '{"accepted_indices":[]}'
  Add-Result "POST /api/admin/scraper/jobs/{id}/import" $r

  $r = Invoke-Curl -Method "DELETE" -Url "$BASE_URL/api/admin/scraper/jobs/$scrapeJobId" -Headers $adminAuth
  Add-Result "DELETE /api/admin/scraper/jobs/{id}" $r

  $pdfPath = Join-Path $PWD "curl-test.pdf"
  Set-Content -Path $pdfPath -Value "%PDF-1.1`n1 0 obj`n<<>>`nendobj`ntrailer`n<<>>`n%%EOF" -Encoding Ascii

  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/syllabus/upload" -Headers @{ "Authorization" = "Bearer $adminToken" } -FormFilePath $pdfPath -FormFieldName "file"
  Add-Result "POST /api/admin/syllabus/upload" $r
  $uploadJson = Try-GetJson -Raw $r.Body
  if ($null -ne $uploadJson -and $uploadJson.PSObject.Properties.Name -contains "upload_id") { $uploadId = [string]$uploadJson.upload_id }

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/syllabus/uploads" -Headers $adminAuth
  Add-Result "GET /api/admin/syllabus/uploads" $r

  $r = Invoke-Curl -Method "GET" -Url "$BASE_URL/api/admin/syllabus/uploads/$uploadId" -Headers $adminAuth
  Add-Result "GET /api/admin/syllabus/uploads/{id}" $r

  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/syllabus/uploads/$uploadId/import" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body '{"structure":{"subjects":[]}}'
  Add-Result "POST /api/admin/syllabus/uploads/{id}/import" $r

  $r = Invoke-Curl -Method "DELETE" -Url "$BASE_URL/api/admin/syllabus/uploads/$uploadId" -Headers $adminAuth
  Add-Result "DELETE /api/admin/syllabus/uploads/{id}" $r

  $r = Invoke-Curl -Method "DELETE" -Url "$BASE_URL/api/admin/questions/$questionId" -Headers $adminAuth
  Add-Result "DELETE /api/admin/questions/{id}" $r

  # Use a disposable subject/topic pair for happy-path delete checks.
  $deleteSubjectBody = @{ name = "Delete Subject $suffix"; description = "delete check"; display_order = 99 } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/content/subjects" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body $deleteSubjectBody
  Add-Result "POST /api/admin/content/subjects (delete-check)" $r
  $deleteSubjectId = "00000000-0000-0000-0000-000000000000"
  $deleteSubjectJson = Try-GetJson -Raw $r.Body
  if ($null -ne $deleteSubjectJson -and $deleteSubjectJson.PSObject.Properties.Name -contains "id") {
    $deleteSubjectId = [string]$deleteSubjectJson.id
  }

  $deleteTopicBody = @{ name = "Delete Topic $suffix"; subtopics = @("X"); nlp_keyword_tags = @("x"); display_order = 1; difficulty_weight = 1.0 } | ConvertTo-Json -Compress
  $r = Invoke-Curl -Method "POST" -Url "$BASE_URL/api/admin/content/subjects/$deleteSubjectId/topics" -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $adminToken" } -Body $deleteTopicBody
  Add-Result "POST /api/admin/content/subjects/{id}/topics (delete-check)" $r
  $deleteTopicId = "00000000-0000-0000-0000-000000000000"
  $deleteTopicJson = Try-GetJson -Raw $r.Body
  if ($null -ne $deleteTopicJson -and $deleteTopicJson.PSObject.Properties.Name -contains "id") {
    $deleteTopicId = [string]$deleteTopicJson.id
  }

  $r = Invoke-Curl -Method "DELETE" -Url "$BASE_URL/api/admin/content/topics/$deleteTopicId" -Headers $adminAuth
  Add-Result "DELETE /api/admin/content/topics/{id}" $r

  $r = Invoke-Curl -Method "DELETE" -Url "$BASE_URL/api/admin/content/subjects/$deleteSubjectId" -Headers $adminAuth
  Add-Result "DELETE /api/admin/content/subjects/{id}" $r

  if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
}

$reportPath = Join-Path $PWD "backend\curl_test_results.txt"
"BASE_URL=$BASE_URL" | Out-File -FilePath $reportPath -Encoding UTF8
$results | Format-Table -AutoSize | Out-String | Add-Content -Path $reportPath

Write-Host "Report saved to $reportPath"
$results | Format-Table -AutoSize
