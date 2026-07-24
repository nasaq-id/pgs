import React from 'react';
import { Institution } from '../types';

interface KopSuratProps {
  institution: Institution;
}

export const KopSurat: React.FC<KopSuratProps> = ({ institution }) => {
  const kopSettings = institution?.kopSettings || {
    useColoredBackground: false,
    backgroundColor: '#f8fafc',
    separatorLineType: 'solid',
    useRoundedRectangle: false,
    showLogoLembaga: true,
    logoLembagaPosition: 'right',
    showLogoKemenag: false,
    logoKemenagPosition: 'left',
    showLogoKemdikbud: true,
    logoKemdikbudPosition: 'left',
    showOrganizer: true,
    showName: true,
    showAddress: true,
    showContact: true,
    alignment: 'center',
    useCustomText: false,
    customText: 'Teks Tambahan KOP',
    customTextSize: 10,
    customTextBold: false,
    customTextItalic: false,
    customTextPosition: 'bottom'
  };

  let containerClass = "flex items-center mb-6 gap-4 text-left print:break-inside-avoid ";
  
  if (kopSettings.useRoundedRectangle) {
    containerClass += "p-4 border-2 border-dashed border-slate-900 rounded-xl ";
  } else {
    containerClass += "pb-4 ";
    if (kopSettings.separatorLineType === 'solid') containerClass += "border-b-2 border-slate-900 ";
    else if (kopSettings.separatorLineType === 'dashed') containerClass += "border-b-2 border-dashed border-slate-900 ";
    else if (kopSettings.separatorLineType === 'double') containerClass += "border-b-4 border-double border-slate-900 ";
  }
  
  let bgStyle = {};
  if (kopSettings.useColoredBackground) {
    bgStyle = { backgroundColor: kopSettings.backgroundColor };
  }

  let alignmentClass = "text-center";
  if (kopSettings.alignment === 'left') alignmentClass = "text-left";
  else if (kopSettings.alignment === 'right') alignmentClass = "text-right";

  // Determine logos to show on left and right
  const leftLogos: { url: string; alt: string }[] = [];
  const rightLogos: { url: string; alt: string }[] = [];

  // Order of preference: Kemdikbud -> Kemenag -> Lembaga (Utama)
  if (kopSettings.showLogoKemdikbud && institution?.kemdikbudLogo) {
    if (kopSettings.logoKemdikbudPosition === 'left') leftLogos.push({ url: institution.kemdikbudLogo, alt: 'Logo Kemdikbud' });
    else rightLogos.push({ url: institution.kemdikbudLogo, alt: 'Logo Kemdikbud' });
  }

  if (kopSettings.showLogoKemenag && institution?.kemenagLogo) {
    if (kopSettings.logoKemenagPosition === 'left') leftLogos.push({ url: institution.kemenagLogo, alt: 'Logo Kemenag' });
    else rightLogos.push({ url: institution.kemenagLogo, alt: 'Logo Kemenag' });
  }

  if (kopSettings.showLogoLembaga && institution?.logo) {
    if (kopSettings.logoLembagaPosition === 'left') leftLogos.push({ url: institution.logo, alt: 'Logo Lembaga' });
    else rightLogos.push({ url: institution.logo, alt: 'Logo Lembaga' });
  }

  const renderCustomText = () => {
    if (!kopSettings.useCustomText || !kopSettings.customText) return null;
    return (
      <div 
        className="mt-1" 
        style={{ 
          fontSize: `${kopSettings.customTextSize || 10}px`,
          fontWeight: kopSettings.customTextBold ? 'bold' : 'normal',
          fontStyle: kopSettings.customTextItalic ? 'italic' : 'normal'
        }}
      >
        {kopSettings.customText}
      </div>
    );
  };

  return (
    <div className={containerClass} style={bgStyle}>
      {leftLogos.length > 0 && (
        <div className="flex items-center gap-3">
          {leftLogos.map((logo, idx) => (
            <div key={idx} className="w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img src={logo.url} alt={logo.alt} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
      )}
      
      <div className={`flex-1 ${alignmentClass}`}>
        {kopSettings.customTextPosition === 'top' && renderCustomText()}

        {kopSettings.showOrganizer && institution.organizer && (
          <h2 className="text-[11px] font-black tracking-widest uppercase text-slate-950 leading-tight">
            {institution.organizer}
          </h2>
        )}
        
        {kopSettings.customTextPosition === 'middle' && renderCustomText()}

        {kopSettings.showName && (
          <h1 className="text-lg font-black tracking-wide text-slate-950 mt-1">
            {institution.name.toUpperCase()}
          </h1>
        )}
        
        {(kopSettings.showAddress || kopSettings.showContact) && (
          <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
            {kopSettings.showAddress && institution.address}
            {kopSettings.showAddress && kopSettings.showContact && ' | '}
            {kopSettings.showContact && (
              <>
                {institution.accreditation && `Akreditasi ${institution.accreditation}`}
                {institution.email && ` | Email: ${institution.email}`}
              </>
            )}
          </p>
        )}

        {kopSettings.customTextPosition === 'bottom' && renderCustomText()}
      </div>
      
      {rightLogos.length > 0 && (
        <div className="flex items-center gap-3">
          {rightLogos.map((logo, idx) => (
            <div key={idx} className="w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img src={logo.url} alt={logo.alt} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
