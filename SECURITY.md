# Security

Specs are data. Counterplot does not execute their fields as JavaScript, HTML or expressions. The output contains trusted bundled application code and validated/escaped content. Inline CSS and scripts use content hashes; external runtime requests are denied by the exported document's CSP.

Only open generated HTML from a builder/source you trust. A maliciously modified HTML file can replace the toolkit code and policy. Validation is not a sandbox for arbitrary third-party code. Titles can contain inaccurate prose even if structurally valid.

The local server binds only to loopback, accepts GET/HEAD, restricts Host headers, resolves symlinks before checking path boundaries and serves only the selected directory. Do not serve a directory containing secrets; it is a development convenience and has no authentication. Do not expose it through a public tunnel. Use a standard static host for publishing.

Report vulnerabilities privately through GitHub's private vulnerability reporting if enabled, or contact the maintainer using the contact details on their GitHub profile. Avoid posting exploit details or secrets publicly until a fix is available.
