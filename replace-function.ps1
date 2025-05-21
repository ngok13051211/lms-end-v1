# Read the content of the fixed function
$fixedFunction = Get-Content -Path "d:\Local\lms-end-v1\fix-function.ts" -Raw

# Read the entire file
$fullFile = Get-Content -Path "d:\Local\lms-end-v1\server\controllers\tutorController.ts" -Raw

# Split the file into parts: before function, function, after function
$pattern = '(?s)(.*?)(export const getPendingTeachingRequests.*?)(?:export const|$)'
if ($fullFile -match $pattern) {
    $beforeFunc = $matches[1]
    $oldFunc = $matches[2]
    
    # Create new file content
    $newContent = $beforeFunc + $fixedFunction
    
    # If there was content after this function
    if ($fullFile.Length -gt ($beforeFunc.Length + $oldFunc.Length)) {
        $afterFunc = $fullFile.Substring($beforeFunc.Length + $oldFunc.Length)
        $newContent = $newContent + $afterFunc
    }
    
    # Write the new content
    $newContent | Set-Content -Path "d:\Local\lms-end-v1\server\controllers\tutorController.ts" -NoNewline
    Write-Host "File updated successfully."
}
else {
    Write-Host "Function not found in the file."
}
