# Trivy Scan Report

{{- if . }}
{{- range . }}

## {{ .Target }}

{{- if .Type }}

### Type: {{ .Type }}

{{- end }}

{{- if .Vulnerabilities }}

### Vulnerabilities ({{ len .Vulnerabilities }})

{{- $vulnCritical := list }}
{{- $vulnHigh := list }}
{{- $vulnMedium := list }}
{{- $vulnLow := list }}
{{- $vulnUnknown := list }}
{{- range .Vulnerabilities }}
  {{- $severity := upper (default "UNKNOWN" .Vulnerability.Severity) }}
  {{- if eq $severity "CRITICAL" }}
    {{- $vulnCritical = append $vulnCritical . }}
  {{- else if eq $severity "HIGH" }}
    {{- $vulnHigh = append $vulnHigh . }}
  {{- else if eq $severity "MEDIUM" }}
    {{- $vulnMedium = append $vulnMedium . }}
  {{- else if eq $severity "LOW" }}
    {{- $vulnLow = append $vulnLow . }}
  {{- else }}
    {{- $vulnUnknown = append $vulnUnknown . }}
  {{- end }}
{{- end }}
{{- $sortedVulnerabilities := concat $vulnCritical $vulnHigh $vulnMedium $vulnLow $vulnUnknown }}

| Package | ID   | Severity | Installed | Fixed | Title |
| :------ | :--- | :------: | :-------- | :---- | :---- |
{{- range $sortedVulnerabilities }}
| {{ escapeXML .PkgName }} | [{{ escapeXML .VulnerabilityID }}]({{ escapeXML .PrimaryURL }}) | {{ escapeXML .Vulnerability.Severity }} | {{ escapeXML .InstalledVersion }} | {{ escapeXML .FixedVersion }} | {{ escapeXML .Title }} |
{{- end }}
{{- end }}

{{- if .Misconfigurations }}

### Misconfigurations ({{ len .Misconfigurations }})

{{- $misconfigCritical := list }}
{{- $misconfigHigh := list }}
{{- $misconfigMedium := list }}
{{- $misconfigLow := list }}
{{- $misconfigUnknown := list }}
{{- range .Misconfigurations }}
  {{- $severity := upper (default "UNKNOWN" .Severity) }}
  {{- if eq $severity "CRITICAL" }}
    {{- $misconfigCritical = append $misconfigCritical . }}
  {{- else if eq $severity "HIGH" }}
    {{- $misconfigHigh = append $misconfigHigh . }}
  {{- else if eq $severity "MEDIUM" }}
    {{- $misconfigMedium = append $misconfigMedium . }}
  {{- else if eq $severity "LOW" }}
    {{- $misconfigLow = append $misconfigLow . }}
  {{- else }}
    {{- $misconfigUnknown = append $misconfigUnknown . }}
  {{- end }}
{{- end }}
{{- $sortedMisconfigurations := concat $misconfigCritical $misconfigHigh $misconfigMedium $misconfigLow $misconfigUnknown }}

| Type | ID   | Severity | Title | Message |
| :--- | :--- | :------: | :---- | :------ |
{{- range $sortedMisconfigurations }}
| {{ escapeXML .Type }} | [{{ escapeXML .ID }}]({{ escapeXML .PrimaryURL }}) | {{ escapeXML .Severity }} | {{ escapeXML .Title }} | {{ escapeXML .Message }} |
{{- end }}
{{- end }}

{{- if .Secrets }}

### Secrets ({{ len .Secrets }})

{{- $secretCritical := list }}
{{- $secretHigh := list }}
{{- $secretMedium := list }}
{{- $secretLow := list }}
{{- $secretUnknown := list }}
{{- range .Secrets }}
  {{- $severity := upper (default "UNKNOWN" .Severity) }}
  {{- if eq $severity "CRITICAL" }}
    {{- $secretCritical = append $secretCritical . }}
  {{- else if eq $severity "HIGH" }}
    {{- $secretHigh = append $secretHigh . }}
  {{- else if eq $severity "MEDIUM" }}
    {{- $secretMedium = append $secretMedium . }}
  {{- else if eq $severity "LOW" }}
    {{- $secretLow = append $secretLow . }}
  {{- else }}
    {{- $secretUnknown = append $secretUnknown . }}
  {{- end }}
{{- end }}
{{- $sortedSecrets := concat $secretCritical $secretHigh $secretMedium $secretLow $secretUnknown }}

| Rule ID | Severity | Title |
| :------ | :------: | :---- |
{{- range $sortedSecrets }}
| {{ escapeXML .RuleID }} | {{ escapeXML .Severity }} | {{ escapeXML .Title }} |
{{- end }}
{{- end }}

{{- if .Licenses }}

### License Violations ({{ len .Licenses }})

{{- $licenseCritical := list }}
{{- $licenseHigh := list }}
{{- $licenseMedium := list }}
{{- $licenseLow := list }}
{{- $licenseUnknown := list }}
{{- range .Licenses }}
  {{- $severity := upper (default "UNKNOWN" .Severity) }}
  {{- if eq $severity "CRITICAL" }}
    {{- $licenseCritical = append $licenseCritical . }}
  {{- else if eq $severity "HIGH" }}
    {{- $licenseHigh = append $licenseHigh . }}
  {{- else if eq $severity "MEDIUM" }}
    {{- $licenseMedium = append $licenseMedium . }}
  {{- else if eq $severity "LOW" }}
    {{- $licenseLow = append $licenseLow . }}
  {{- else }}
    {{- $licenseUnknown = append $licenseUnknown . }}
  {{- end }}
{{- end }}
{{- $sortedLicenses := concat $licenseCritical $licenseHigh $licenseMedium $licenseLow $licenseUnknown }}

| Package | Severity | License |
| :------ | :------: | :------ |
{{- range $sortedLicenses }}
| {{ escapeXML .PkgName }} | {{ escapeXML .Severity }} | {{ escapeXML .Name }} |
{{- end }}
{{- end }}

---
{{- end }}
{{- else }}
Trivy Returned Empty Report
{{- end }}
