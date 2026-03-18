# Browser Fallback Reference

> Chrome automation for Service Fusion operations not available via API.
> Uses `mcp__claude-in-chrome__*` tools for browser interaction.

---

## When to Use Browser vs API

| Operation | Method | Why |
|-----------|--------|-----|
| Customer CRUD, jobs, estimates | **API** | Full API coverage |
| PDF report generation | **Browser** | No API endpoint for PDF export |
| Dispatch board visual view | **Browser** | Complex drag-and-drop UI only |
| Admin settings changes | **Browser** | Most settings not exposed in API |
| Bulk data export | **Browser** | Export features are UI-only |
| Custom report generation | **Browser** | Report builder is UI-only |
| Payment processing | **Browser** | Payment gateway requires browser |
| Document template editing | **Browser** | Template editor is UI-only |

**Rule:** Always try the API first. Only fall back to browser when the operation genuinely isn't available via API.

## Authentication in Browser

### Login Flow

1. Navigate to Service Fusion:
   ```
   mcp__claude-in-chrome__navigate({ url: "https://app.servicefusion.com" })
   ```

2. If not already logged in, the login page will show:
   - Email field: Use Phoenix Electric admin credentials
   - Password field: Use stored credentials
   - **Note:** Credentials should be in the browser's password manager — do NOT hardcode

3. After login, verify dashboard loads:
   ```
   mcp__claude-in-chrome__read_page({ tabId: <id> })
   ```

### Session Management

- SF sessions timeout after inactivity
- Browser may already be logged in from previous use
- Always check current page state before assuming login is needed

## Common Browser-Only Operations

### PDF Report Generation

1. Navigate to Reports section:
   ```
   mcp__claude-in-chrome__navigate({ url: "https://app.servicefusion.com/reports" })
   ```

2. Select report type (Job Summary, Invoice Report, etc.)

3. Set date range and filters

4. Click "Generate" / "Export PDF"

5. Wait for download to complete

### Dispatch Board

1. Navigate to dispatch:
   ```
   mcp__claude-in-chrome__navigate({ url: "https://app.servicefusion.com/dispatch" })
   ```

2. Read the visual board:
   ```
   mcp__claude-in-chrome__read_page({ tabId: <id> })
   ```

3. For drag-and-drop operations, use coordinate-based interaction (complex — prefer API rescheduling when possible)

### Admin Settings

1. Navigate to settings:
   ```
   mcp__claude-in-chrome__navigate({ url: "https://app.servicefusion.com/settings" })
   ```

2. Navigate to specific setting area (users, roles, business units, etc.)

3. Make changes via form interaction

## Chrome Automation Best Practices

1. **Tab management:** Create a dedicated tab for SF browser operations
   ```
   mcp__claude-in-chrome__tabs_create_mcp({ url: "https://app.servicefusion.com" })
   ```

2. **Wait for page loads:** After navigation, verify content loaded before interacting

3. **Avoid dialogs:** SF may show confirmation dialogs — handle with JavaScript if needed

4. **Screenshots:** Capture state before and after changes for audit trail

5. **Timeout handling:** SF pages can be slow — allow adequate load time

## Limitations

- Browser automation is slower than API calls
- UI changes in SF can break automation flows
- Some operations require multiple page navigations
- File downloads go to the default Downloads directory
- Complex forms may need coordinate-based clicking

---

*Browser Fallback Reference | 2026-03-08*
