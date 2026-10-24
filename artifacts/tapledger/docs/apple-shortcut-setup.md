# Apple Shortcut setup

TapLedger's shortcut handoff opens the existing expense form with suggested values. It does not create a transaction until the user reviews the form and taps **Save purchase**.

## Build the Shortcut on iPhone

1. In the Shortcuts app, create a new shortcut named **Add expense to TapLedger**.
2. Add **Ask for Input** with input type **Number** and prompt **How much did you spend?**
3. Add **Ask for Input** with input type **Text** and prompt **Where did you spend it?**
4. Add **URL Encode** for the merchant answer so punctuation and spaces are safe in a URL.
5. Add **Choose from Menu** for the payment method, with these choices: Cash, Debit Card, Credit Card, TNG, DuitNow QR, and Other.
6. Add **URL Encode** for the chosen payment method.
7. Add a **Text** action and insert the Ask for Input and URL Encode magic variables:

   ```text
   https://YOUR-PUBLISHED-TAPLEDGER-DOMAIN/?quickAdd=true&amount=[Amount]&merchant=[Encoded Merchant]&paymentMethod=[Encoded Payment Method]
   ```

   Replace `YOUR-PUBLISHED-TAPLEDGER-DOMAIN` with the published TapLedger address. Do not add API keys or other credentials to this URL.
8. Add **Open URLs** and pass it the Text result.
9. When TapLedger opens, check the merchant, amount, category, payment method, and date/time. Tap **Save purchase** only after confirming the details.

The short payment method `TNG` is accepted and displayed as **TNG eWallet**. Known merchant descriptions still receive the same editable category suggestions as manual entry.

## Assign Back Tap

After saving the Shortcut, open iPhone **Settings → Accessibility → Touch → Back Tap**. Choose **Double Tap** or **Triple Tap**, then select **Add expense to TapLedger**.

Back Tap runs the Shortcut; it does not grant a normal website permission to silently capture another app's screen.

## What the handoff does

- `quickAdd=true` opens TapLedger's existing expense form.
- Amount, merchant, and payment method are prefilled when valid. Unknown or invalid values are not trusted; the form asks the user to review or complete them.
- The one-time handoff parameters are removed from the address bar after the form opens.
- No transaction is saved until the user confirms. The existing form prevents a second submit while a save is in progress.
- This is a URL handoff, not a server API. URL values can be visible to the browser and may appear in system or access logs. Do not include secrets or credentials, and avoid putting information in the URL that should not be exposed.

## Future screenshot or receipt recognition

No screenshot capture, OCR, or AI processing is implemented. For a future integration, accept only a screenshot the user explicitly selected or a capture iOS explicitly permits. A secure server-side service could return an untrusted `ExpenseReviewDraft`; pass that draft into the same review form and require the user's confirmation before saving. Keep any service credentials on the server, never in the app bundle or URL.
