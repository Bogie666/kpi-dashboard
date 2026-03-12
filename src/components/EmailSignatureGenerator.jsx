"use client";

import React, { useState, useRef, useCallback } from 'react';
import { put } from '@vercel/blob';

function buildSignatureHTML(photoSrc, name, title, phone, email, website) {
  const displayName = name || 'Your Name';
  const websiteDisplay = website ? website.replace(/^https?:\/\/(www\.)?/, '') : '';

  const titleRow = title ? `
        <tr>
          <td style="padding-bottom:4px;">
            <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:600;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;">${title}</span>
          </td>
        </tr>` : '';

  const phoneRow = phone ? `
        <tr>
          <td style="padding-bottom:5px;">
            <span style="color:#1a2b5e;font-size:10px;">&#9679;&nbsp;</span><a href="tel:${phone.replace(/\D/g, '')}" style="font-family:Arial,sans-serif;font-size:13px;color:#3a4a62;text-decoration:none;">${phone}</a>
          </td>
        </tr>` : '';

  const emailRow = email ? `
        <tr>
          <td style="padding-bottom:5px;">
            <span style="color:#1a2b5e;font-size:10px;">&#9679;&nbsp;</span><a href="mailto:${email}" style="font-family:Arial,sans-serif;font-size:13px;color:#3a4a62;text-decoration:none;">${email}</a>
          </td>
        </tr>` : '';

  const websiteRow = website ? `
        <tr>
          <td>
            <span style="color:#1a2b5e;font-size:10px;">&#9679;&nbsp;</span><a href="${website}" target="_blank" style="font-family:Arial,sans-serif;font-size:13px;color:#3a4a62;text-decoration:none;">${websiteDisplay}</a>
          </td>
        </tr>` : '';

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,sans-serif;">
  <tr>
    <td colspan="4" style="padding-bottom:12px;font-size:0;line-height:0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
        <tr><td style="height:3px;background-color:#c9a84c;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td valign="top" style="vertical-align:top;">
      <img src="${photoSrc}" alt="${displayName}" width="130" height="165" style="display:block;border-radius:6px;width:130px;height:165px;object-fit:cover;object-position:center top;" />
    </td>
    <td style="width:20px;">&nbsp;</td>
    <td style="width:2px;background:linear-gradient(to bottom,#c9a84c,#1a2b5e);padding:0;">&nbsp;</td>
    <td valign="top" style="padding-left:20px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding-bottom:${title ? '2px' : '8px'};">
            <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:22px;font-weight:700;color:#0d1a2e;letter-spacing:0.5px;line-height:1;">${displayName}</span>
          </td>
        </tr>
        ${titleRow}
        <tr>
          <td style="padding-bottom:16px;">
            <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td valign="middle">
                  <img src="https://www.lexairconditioning.com/wp-content/uploads/2024/01/cropped-lex-logo@2x.png" alt="LEX Air Conditioning" height="38" style="display:block;height:38px;width:auto;" />
                </td>
                <td valign="middle" style="padding-left:10px;border-left:1px solid #d0d8e8;">
                  <span style="font-family:Arial,sans-serif;font-size:10px;color:#8a9ab5;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;">The Gold Standard of White Glove Service</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${phoneRow}
        ${emailRow}
        ${websiteRow}
      </table>
    </td>
  </tr>
</table>`;
}

const DEFAULT_PHOTO = 'https://www.lexairconditioning.com/wp-content/uploads/2026/02/IMG_20260218_214609.png';

const EmailSignatureGenerator = ({ hideHeader = false }) => {
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('https://www.lexairconditioning.com');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef(null);

  const getPhotoSrc = useCallback(() => {
    if (photoUrl) return photoUrl;
    if (photoDataUrl) return photoDataUrl;
    return DEFAULT_PHOTO;
  }, [photoUrl, photoDataUrl]);

  const signatureHTML = generated
    ? buildSignatureHTML(getPhotoSrc(), fullName, jobTitle, phone, email, website)
    : '';

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoDataUrl(ev.target.result);
      setPhotoFileName(file.name);
    };
    reader.readAsDataURL(file);

    // Upload to Vercel Blob for a hosted URL
    setUploading(true);
    try {
      const blob = await put(`signature-photos/${Date.now()}-${file.name}`, file, {
        access: 'public',
        token: 'vercel_blob_rw_rCVi7YK1DOpsCWkK_a8dDfPIZHlGcWvWfZ15JBAGqGSk5d2'
      });
      setPhotoUrl(blob.url);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Photo upload failed — you can still paste a hosted URL manually.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = () => {
    setGenerated(true);
  };

  const handleCopy = async () => {
    const gmailPhotoSrc = photoUrl || getPhotoSrc();
    const gmailHTML = buildSignatureHTML(gmailPhotoSrc, fullName, jobTitle, phone, email, website);

    if (navigator.clipboard && window.ClipboardItem) {
      const blob = new Blob([gmailHTML], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      try {
        await navigator.clipboard.write([item]);
        showCopied();
        return;
      } catch (e) { /* fall through to fallback */ }
    }
    // Fallback: select and copy the rendered preview
    if (previewRef.current) {
      const range = document.createRange();
      range.selectNode(previewRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      showCopied();
    }
  };

  const showCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const inputClass = "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2.5 text-sm text-gray-200 focus:border-yellow-600 focus:outline-none transition-colors placeholder-gray-600";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center space-x-3 mb-6">
          <h3 className="text-lg font-medium">Email Signature Generator</h3>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-yellow-600 uppercase tracking-widest flex items-center gap-2">
            Your Photo
            <span className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Photo Upload */}
          <div>
            <label
              className={`block border-2 border-dashed rounded-md p-5 text-center cursor-pointer transition-colors ${
                photoDataUrl ? 'border-yellow-600 border-solid' : 'border-gray-700 hover:border-yellow-600 hover:bg-yellow-600/5'
              }`}
            >
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {photoDataUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={photoDataUrl} alt="Preview" className="w-20 h-24 object-cover object-top rounded border-2 border-yellow-600" />
                  <span className="text-xs text-gray-500">{photoFileName}</span>
                  {uploading && <span className="text-xs text-yellow-600">Uploading...</span>}
                  {!uploading && photoUrl && <span className="text-xs text-green-400">Hosted and ready for Gmail</span>}
                </div>
              ) : (
                <div>
                  <span className="text-2xl block mb-1">📷</span>
                  <div className="text-sm text-gray-500">
                    <span className="text-yellow-600 font-semibold">Click to upload</span> your headshot
                    <br />
                    <span className="text-xs">JPG, PNG — auto-hosted for Gmail use</span>
                  </div>
                </div>
              )}
            </label>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Upload a photo above and it will be automatically hosted, or paste your own URL below.
            </p>
          </div>

          <div>
            <label className={labelClass}>Photo URL {photoUrl && !uploading && <span className="text-green-400 normal-case tracking-normal">(auto-filled from upload)</span>}</label>
            <input type="url" className={inputClass} placeholder="https://yoursite.com/photo.jpg" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
          </div>

          <div className="text-xs font-semibold text-yellow-600 uppercase tracking-widest flex items-center gap-2 pt-2">
            Your Info
            <span className="flex-1 h-px bg-gray-700" />
          </div>

          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" className={inputClass} placeholder="e.g. John Doe" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input type="text" className={inputClass} placeholder="e.g. Operations Manager" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" className={inputClass} placeholder="(555) 555-5555" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} placeholder="e.g. jdoe@lexairconditioning.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input type="url" className={inputClass} value={website} onChange={e => setWebsite(e.target.value)} />
          </div>

          <button
            onClick={handleGenerate}
            className="w-full mt-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold text-sm uppercase tracking-widest py-3 rounded transition-colors"
          >
            ⚡ Generate Signature
          </button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Live Preview</span>
            <button
              onClick={handleCopy}
              disabled={!generated}
              className={`text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded border transition-colors flex items-center gap-2 ${
                copied
                  ? 'bg-green-900 border-green-700 text-green-300'
                  : generated
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 cursor-pointer'
                    : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-40'
              }`}
            >
              <span>{copied ? '✅' : '📋'}</span>
              {copied ? 'Copied!' : 'Copy Signature'}
            </button>
          </div>

          {/* Email Mockup */}
          <div className="bg-gray-100 rounded-lg overflow-hidden shadow-2xl">
            {/* Title bar */}
            <div className="bg-gray-200 px-4 py-2.5 flex items-center gap-2 border-b border-gray-300">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-500 ml-1">New Message — Gmail</span>
            </div>
            {/* Fields */}
            <div className="bg-white px-5 py-2 border-b border-gray-200">
              <div className="text-sm text-gray-400 py-1 border-b border-gray-100">To</div>
              <div className="text-sm text-gray-400 py-1">Subject</div>
            </div>
            {/* Body */}
            <div className="bg-white p-5 min-h-[160px]">
              {generated ? (
                <div ref={previewRef} dangerouslySetInnerHTML={{ __html: signatureHTML }} />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-4xl block mb-3 opacity-40">✍️</span>
                  <p className="text-sm">
                    Fill in your info and click<br />
                    <strong className="text-gray-600">Generate Signature</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Install instructions */}
          <div className="bg-gray-800 border border-gray-700 rounded-md p-5">
            <h4 className="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-3">How to install in Gmail</h4>
            <div className="space-y-2">
              {[
                <>Click <strong className="text-gray-200">Generate Signature</strong>, then <strong className="text-gray-200">Copy Signature</strong> above.</>,
                <>Open <strong className="text-gray-200">Gmail → Settings ⚙ → See all settings → Signature</strong>.</>,
                <>Click <strong className="text-gray-200">Create new</strong>, name it, then paste with <strong className="text-gray-200">Ctrl+V / ⌘V</strong>.</>,
                <>Set as default and click <strong className="text-gray-200">Save Changes</strong>.</>,
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-500 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-gray-900 border border-gray-700 text-yellow-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSignatureGenerator;
