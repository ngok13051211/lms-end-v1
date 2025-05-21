$content = Get-Content 'd:\Local\lms-end-v1\server\controllers\tutorController.ts' -Raw
$content = $content -replace 'return res.status\(500\).json\(\{ message: "Lỗi máy chủ nội bộ" \}\);\s+\}', 'return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};'
$content | Set-Content 'd:\Local\lms-end-v1\server\controllers\tutorController.ts'
