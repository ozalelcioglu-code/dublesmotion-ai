export default function PrivacyPolicyPage() {
  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1>Privacy Policy</h1>

      <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>

      <h2>1. Controller</h2>
      <p>
        Duble-S Technology<br />
        LangStrasse 12053 Berlin<br />
        Email: info@dublestechnology.com
      </p>

      <h2>2. Data We Collect</h2>
      <ul>
        <li>Name, email, account info</li>
        <li>Usage data</li>
        <li>IP address & device info</li>
        <li>Uploaded content</li>
      </ul>

      <h2>3. Purpose</h2>
      <ul>
        <li>Provide AI services</li>
        <li>Security & fraud detection</li>
        <li>Improve platform</li>
      </ul>

      <h2>4. Legal Basis</h2>
      <p>Contract, legitimate interest, legal obligation.</p>

      <h2>5. Security</h2>
      <p>
        We use modern security systems to protect your data.
      </p>

      <h2>6. Your Rights</h2>
      <ul>
        <li>Access</li>
        <li>Delete</li>
        <li>Correct</li>
        <li>Object</li>
      </ul>

      <h2>7. Contact</h2>
      <p>ozal@dublestechnology.com</p>
    </div>
  );
}