import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Privacy Policy Content */}
        <div className="p-8">
          <div 
            className="privacy-policy-content"
            dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }}
          />
        </div>
      </div>
    </div>
  );
}

// Termly Privacy Policy HTML with branded styling
const PRIVACY_POLICY_HTML = `
<style>
  .privacy-policy-content {
    font-family: Lato, Arial, sans-serif;
    background: transparent;
    line-height: 1.6;
  }
  .privacy-policy-content [data-custom-class='body'],
  .privacy-policy-content [data-custom-class='body'] * {
    background: transparent !important;
  }
  .privacy-policy-content [data-custom-class='title'],
  .privacy-policy-content [data-custom-class='title'] *,
  .privacy-policy-content h1 {
    font-family: Lato, Arial, sans-serif !important;
    font-size: 26px !important;
    color: #3d4d39 !important;
    font-weight: bold;
    margin-bottom: 1rem;
  }
  .privacy-policy-content [data-custom-class='subtitle'],
  .privacy-policy-content [data-custom-class='subtitle'] * {
    font-family: Lato, Arial, sans-serif !important;
    color: #5b7355 !important;
    font-size: 14px !important;
  }
  .privacy-policy-content [data-custom-class='heading_1'],
  .privacy-policy-content [data-custom-class='heading_1'] *,
  .privacy-policy-content h2 {
    font-family: Lato, Arial, sans-serif !important;
    font-size: 19px !important;
    color: #3d4d39 !important;
    font-weight: bold;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  .privacy-policy-content [data-custom-class='heading_2'],
  .privacy-policy-content [data-custom-class='heading_2'] *,
  .privacy-policy-content h3 {
    font-family: Arial, sans-serif !important;
    font-size: 17px !important;
    color: #000000 !important;
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .privacy-policy-content [data-custom-class='body_text'],
  .privacy-policy-content [data-custom-class='body_text'] *,
  .privacy-policy-content p {
    color: #5b7355 !important;
    font-size: 14px !important;
    font-family: Lato, Arial, sans-serif !important;
    margin-bottom: 1rem;
  }
  .privacy-policy-content [data-custom-class='link'],
  .privacy-policy-content [data-custom-class='link'] *,
  .privacy-policy-content a {
    color: #e8b4ba !important;
    font-size: 14px !important;
    font-family: Arial, sans-serif !important;
    word-break: break-word !important;
    text-decoration: underline;
  }
  .privacy-policy-content a:hover {
    color: #5F7252 !important;
  }
  .privacy-policy-content ul, .privacy-policy-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  .privacy-policy-content li {
    margin-bottom: 0.5rem;
    color: #5b7355 !important;
    font-size: 14px !important;
  }
  .privacy-policy-content strong {
    font-weight: bold;
  }
  .privacy-policy-content em {
    font-style: italic;
  }
  .privacy-policy-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  .privacy-policy-content td {
    border: 1px solid #3d4d39;
    padding: 0.5rem;
    color: #5b7355 !important;
    font-size: 14px !important;
  }
  .privacy-policy-content .subtitle {
    color: #5b7355;
    font-size: 14px;
    margin-bottom: 2rem;
  }
  .privacy-policy-content .MsoNormal {
    margin: 0;
  }
</style>

<h1 style="color: #3d4d39 !important;">Privacy Notice</h1>
<p class="subtitle"><strong>Last updated January 07, 2026</strong></p>

<p>This Privacy Notice for <strong>Darkridge</strong> (doing business as <strong>Sarah's Books</strong>) ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"), describes how and why we might access, collect, store, use, and/or share ("<strong>process</strong>") your personal information when you use our services ("<strong>Services</strong>"), including when you:</p>

<ul>
  <li>Visit our website at <a href="https://www.sarahsbooks.com" target="_blank">https://www.sarahsbooks.com</a> or any website of ours that links to this Privacy Notice</li>
  <li>Use Sarah's Books - Personalized books recommendations app</li>
  <li>Engage with us in other related ways, including any marketing or events</li>
</ul>

<p><strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:hello@sarahsbooks.com">hello@sarahsbooks.com</a>.</p>

<h2>SUMMARY OF KEY POINTS</h2>

<p><strong><em>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</em></strong></p>

<p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.</p>

<p><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>

<p><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>

<p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</p>

<p><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties.</p>

<p><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.</p>

<p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.</p>

<p><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by submitting a <a href="https://app.termly.io/dsar/82625aa0-a62b-49b2-8104-2a808e6f0e46" target="_blank">data subject access request</a>, or by contacting us.</p>

<h2>TABLE OF CONTENTS</h2>

<ol>
  <li><a href="#infocollect">WHAT INFORMATION DO WE COLLECT?</a></li>
  <li><a href="#infouse">HOW DO WE PROCESS YOUR INFORMATION?</a></li>
  <li><a href="#legalbases">WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</a></li>
  <li><a href="#whoshare">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
  <li><a href="#cookies">DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</a></li>
  <li><a href="#ai">DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</a></li>
  <li><a href="#sociallogins">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a></li>
  <li><a href="#inforetain">HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
  <li><a href="#infosafe">HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
  <li><a href="#infominors">DO WE COLLECT INFORMATION FROM MINORS?</a></li>
  <li><a href="#privacyrights">WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
  <li><a href="#DNT">CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
  <li><a href="#uslaws">DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a></li>
  <li><a href="#otherlaws">DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?</a></li>
  <li><a href="#policyupdates">DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
  <li><a href="#contact">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
  <li><a href="#request">HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
</ol>

<h2 id="infocollect">1. WHAT INFORMATION DO WE COLLECT?</h2>

<h3>Personal information you disclose to us</h3>

<p><strong><em>In Short:</em></strong> <em>We collect personal information that you provide to us.</em></p>

<p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>

<p><strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:</p>

<ul>
  <li>names</li>
  <li>email addresses</li>
  <li>contact preferences</li>
  <li>contact or authentication data</li>
  <li>billing addresses</li>
  <li>debit/credit card numbers</li>
</ul>

<p><strong>Sensitive Information.</strong> We do not process sensitive information.</p>

<p><strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider.</p>

<p>All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>

<h3>Information automatically collected</h3>

<p><strong><em>In Short:</em></strong> <em>Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</em></p>

<p>We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information.</p>

<p>Like many businesses, we also collect information through cookies and similar technologies.</p>

<p>The information we collect includes:</p>

<ul>
  <li><em>Log and Usage Data.</em> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services.</li>
  <li><em>Location Data.</em> We collect location data such as information about your device's location, which can be either precise or imprecise.</li>
</ul>

<h3>Google API</h3>

<p>Our use of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank">Google API Services User Data Policy</a>, including the <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" target="_blank">Limited Use requirements</a>.</p>

<h2 id="contact">16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>

<p>If you have questions or comments about this notice, you may contact our Data Protection Officer (DPO) by email at <a href="mailto:hello@sarahsbooks.com">hello@sarahsbooks.com</a>, or contact us by post at:</p>

<p>
<strong>Darkridge</strong><br>
Data Protection Officer<br>
9309 26th Pl NW<br>
Seattle, WA 98117<br>
United States
</p>

<h2 id="request">17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>

<p>You have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. To request to review, update, or delete your personal information, please fill out and submit a <a href="https://app.termly.io/dsar/82625aa0-a62b-49b2-8104-2a808e6f0e46" target="_blank">data subject access request</a>.</p>
`;
