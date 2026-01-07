import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfUsePage({ onNavigate }) {
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

        {/* Terms of Use Content */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-8 shadow-sm">
          <div 
            className="terms-content"
            dangerouslySetInnerHTML={{ __html: TERMS_HTML }}
          />
        </div>
      </div>
    </div>
  );
}

// Termly Terms of Use HTML
const TERMS_HTML = `
<style>
  .terms-content {
    font-family: Arial, sans-serif;
    color: #595959;
    line-height: 1.6;
  }
  .terms-content h1 {
    font-size: 26px;
    color: #000000;
    font-weight: bold;
    margin-bottom: 1rem;
  }
  .terms-content h2 {
    font-size: 19px;
    color: #000000;
    font-weight: bold;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  .terms-content h3 {
    font-size: 17px;
    color: #000000;
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .terms-content p {
    margin-bottom: 1rem;
  }
  .terms-content a {
    color: #3030F1;
    text-decoration: underline;
  }
  .terms-content a:hover {
    color: #5F7252;
  }
  .terms-content ul, .terms-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  .terms-content li {
    margin-bottom: 0.5rem;
  }
  .terms-content strong {
    font-weight: bold;
  }
  .terms-content em {
    font-style: italic;
  }
  .terms-content .subtitle {
    color: #595959;
    font-size: 14px;
    margin-bottom: 2rem;
  }
</style>

<h1>Terms of Use</h1>
<p class="subtitle"><strong>Last updated January 07, 2026</strong></p>

<h2>AGREEMENT TO OUR LEGAL TERMS</h2>

<p>We are <strong>Darkridge</strong>, doing business as <strong>Sarah's Books</strong> ("<strong>Company</strong>," "<strong>we</strong>," "<strong>us</strong>," "<strong>our</strong>"), a company registered in Washington, United States at 9309 26th Pl NW, Seattle, WA 98117.</p>

<p>We operate the website <a href="https://www.sarahsbooks.com" target="_blank">https://www.sarahsbooks.com</a> (the "<strong>Site</strong>"), as well as any other related products and services that refer or link to these legal terms (the "<strong>Legal Terms</strong>") (collectively, the "<strong>Services</strong>").</p>

<p>You can contact us by email at <a href="mailto:hello@sarahsbooks.com">hello@sarahsbooks.com</a> or by mail to 9309 26th Pl NW, Seattle, WA 98117, United States.</p>

<p>These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("<strong>you</strong>"), and Darkridge, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. <strong>IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.</strong></p>

<p>We will provide you with prior notice of any scheduled changes to the Services you are using. The modified Legal Terms will become effective upon posting or notifying you by <a href="mailto:hello@sarahsbooks.com">hello@sarahsbooks.com</a>, as stated in the email message. By continuing to use the Services after the effective date of any changes, you agree to be bound by the modified terms.</p>

<p>The Services are intended for users who are at least 13 years of age. All users who are minors in the jurisdiction in which they reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to use the Services. If you are a minor, you must have your parent or guardian read and agree to these Legal Terms prior to you using the Services.</p>

<p>We recommend that you print a copy of these Legal Terms for your records.</p>

<h2>TABLE OF CONTENTS</h2>

<ol>
  <li><a href="#services">OUR SERVICES</a></li>
  <li><a href="#ip">INTELLECTUAL PROPERTY RIGHTS</a></li>
  <li><a href="#userreps">USER REPRESENTATIONS</a></li>
  <li><a href="#userreg">USER REGISTRATION</a></li>
  <li><a href="#products">PRODUCTS</a></li>
  <li><a href="#purchases">PURCHASES AND PAYMENT</a></li>
  <li><a href="#returnno">RETURN/REFUNDS POLICY</a></li>
  <li><a href="#prohibited">PROHIBITED ACTIVITIES</a></li>
  <li><a href="#ugc">USER GENERATED CONTRIBUTIONS</a></li>
  <li><a href="#license">CONTRIBUTION LICENSE</a></li>
  <li><a href="#reviews">GUIDELINES FOR REVIEWS</a></li>
  <li><a href="#thirdparty">THIRD-PARTY WEBSITES AND CONTENT</a></li>
  <li><a href="#sitemanage">SERVICES MANAGEMENT</a></li>
  <li><a href="#ppyes">PRIVACY POLICY</a></li>
  <li><a href="#copyrightyes">COPYRIGHT INFRINGEMENTS</a></li>
  <li><a href="#terms">TERM AND TERMINATION</a></li>
  <li><a href="#modifications">MODIFICATIONS AND INTERRUPTIONS</a></li>
  <li><a href="#law">GOVERNING LAW</a></li>
  <li><a href="#disputes">DISPUTE RESOLUTION</a></li>
  <li><a href="#corrections">CORRECTIONS</a></li>
  <li><a href="#disclaimer">DISCLAIMER</a></li>
  <li><a href="#liability">LIMITATIONS OF LIABILITY</a></li>
  <li><a href="#indemnification">INDEMNIFICATION</a></li>
  <li><a href="#userdata">USER DATA</a></li>
  <li><a href="#electronic">ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</a></li>
  <li><a href="#california">CALIFORNIA USERS AND RESIDENTS</a></li>
  <li><a href="#misc">MISCELLANEOUS</a></li>
  <li><a href="#contact">CONTACT US</a></li>
</ol>

<h2 id="services">1. OUR SERVICES</h2>

<p>The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country.</p>

<p>The Services are not tailored to comply with industry-specific regulations (Health Insurance Portability and Accountability Act (HIPAA), Federal Information Security Management Act (FISMA), etc.), so if your interactions would be subjected to such laws, you may not use the Services. You may not use the Services in a way that would violate the Gramm-Leach-Bliley Act (GLBA).</p>

<h2 id="ip">2. INTELLECTUAL PROPERTY RIGHTS</h2>

<h3>Our intellectual property</h3>

<p>We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").</p>

<p>Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) and treaties in the United States and around the world.</p>

<p>The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use only.</p>

<h3>Your use of our Services</h3>

<p>Subject to your compliance with these Legal Terms, including the "<a href="#prohibited">PROHIBITED ACTIVITIES</a>" section below, we grant you a non-exclusive, non-transferable, revocable license to:</p>

<ul>
  <li>access the Services; and</li>
  <li>download or print a copy of any portion of the Content to which you have properly gained access,</li>
</ul>

<p>solely for your personal, non-commercial use.</p>

<h2 id="userreps">3. USER REPRESENTATIONS</h2>

<p>By using the Services, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Legal Terms; (4) you are not under the age of 13; (5) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services; (6) you will not access the Services through automated or non-human means, whether through a bot, script or otherwise; (7) you will not use the Services for any illegal or unauthorized purpose; and (8) your use of the Services will not violate any applicable law or regulation.</p>

<h2 id="prohibited">8. PROHIBITED ACTIVITIES</h2>

<p>You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>

<p>As a user of the Services, you agree not to:</p>

<ul>
  <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
  <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
  <li>Circumvent, disable, or otherwise interfere with security-related features of the Services.</li>
  <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
  <li>Use any information obtained from the Services in order to harass, abuse, or harm another person.</li>
  <li>Make improper use of our support services or submit false reports of abuse or misconduct.</li>
  <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
  <li>Engage in unauthorized framing of or linking to the Services.</li>
  <li>Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material that interferes with any party's uninterrupted use and enjoyment of the Services.</li>
  <li>Engage in any automated use of the system.</li>
  <li>Delete the copyright or other proprietary rights notice from any Content.</li>
  <li>Attempt to impersonate another user or person or use the username of another user.</li>
  <li>Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism.</li>
  <li>Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.</li>
  <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.</li>
  <li>Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.</li>
  <li>Decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services.</li>
  <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.</li>
</ul>

<h2 id="ppyes">14. PRIVACY POLICY</h2>

<p>We care about data privacy and security. Please review our Privacy Policy: <strong><a href="https://www.sarahsbooks.com/privacy-policy" target="_blank">https://www.sarahsbooks.com/privacy-policy</a></strong>. By using the Services, you agree to be bound by our Privacy Policy, which is incorporated into these Legal Terms.</p>

<h2 id="law">18. GOVERNING LAW</h2>

<p>These Legal Terms and your use of the Services are governed by and construed in accordance with the laws of the State of Delaware applicable to agreements made and to be entirely performed within the State of Delaware, without regard to its conflict of law principles.</p>

<h2 id="disputes">19. DISPUTE RESOLUTION</h2>

<h3>Binding Arbitration</h3>

<p>If the Parties are unable to resolve a Dispute through informal negotiations, the Dispute (except those Disputes expressly excluded below) will be finally and exclusively resolved by binding arbitration. YOU UNDERSTAND THAT WITHOUT THIS PROVISION, YOU WOULD HAVE THE RIGHT TO SUE IN COURT AND HAVE A JURY TRIAL.</p>

<h2 id="disclaimer">21. DISCLAIMER</h2>

<p>THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF.</p>

<h2 id="liability">22. LIMITATIONS OF LIABILITY</h2>

<p>IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>

<h2 id="contact">28. CONTACT US</h2>

<p>In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:</p>

<p>
<strong>Darkridge</strong><br>
9309 26th Pl NW<br>
Seattle, WA 98117<br>
United States<br>
<a href="mailto:hello@sarahsbooks.com">hello@sarahsbooks.com</a>
</p>
`;
