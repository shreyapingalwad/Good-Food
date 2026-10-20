import React from 'react';
import { X, ExternalLink, ShieldCheck, FileText, Image } from 'lucide-react';
import { ASSET_MANIFEST } from '../../data/assetsManifest';

interface AssetManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetManifestModal: React.FC<AssetManifestModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1C221E] border border-[#28312B] rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#28312B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F7F5EF]">Asset & Licensing Manifest</h3>
              <p className="text-xs text-[#A9B7A0]">Legitimate sources, verified commercial/non-commercial licenses & attributions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#A9B7A0] hover:text-[#F7F5EF] hover:bg-[#28312B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="p-4 rounded-2xl bg-[#123B2A]/40 border border-[#D8F078]/20 flex items-center gap-3 text-xs text-[#D8F078]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>
              All photography, 3D rendering scripts, and typography adhere to legitimate open licensing (Unsplash Free License, Three.js MIT, Google Fonts SIL Open Font License).
            </span>
          </div>

          {/* Asset List */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#A9B7A0]">Curated Photography Manifest</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ASSET_MANIFEST.map((asset) => (
                <div key={asset.id} className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-[#F7F5EF]">{asset.title}</div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/20 shrink-0">
                      {asset.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#A9B7A0]">{asset.description}</p>
                  
                  <div className="pt-2 border-t border-[#28312B] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#F7F5EF]">Author: {asset.author}</span>
                    <a
                      href={asset.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D8F078] hover:underline flex items-center gap-1"
                    >
                      <span>{asset.license}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Software & Libraries */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#A9B7A0]">3D & Creative Framework Credits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <div className="font-bold text-[#F7F5EF]">Three.js WebGL Engine</div>
                <div className="text-[#A9B7A0] text-[11px]">Mr.doob & Contributors (MIT)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <div className="font-bold text-[#F7F5EF]">DM Serif Display & Manrope</div>
                <div className="text-[#A9B7A0] text-[11px]">Google Fonts (SIL OFL)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <div className="font-bold text-[#F7F5EF]">Lucide Icons</div>
                <div className="text-[#A9B7A0] text-[11px]">Lucide Open Source (ISC)</div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#28312B] bg-[#151916] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#28312B] hover:bg-[#313C34] text-[#F7F5EF] transition-colors"
          >
            Close Manifest
          </button>
        </div>

      </div>
    </div>
  );
};
