import { useRef, useState } from 'react';
import { encryptedBackupJson, restoreEncryptedBackup, type VaultSession } from '../../services/vault';

function fileDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
  const get = (type:string) => parts.find((part) => part.type === type)?.value ?? '';
  return get('year') + '-' + get('month') + '-' + get('day');
}
export function BackupControls({ onRestored }: { onRestored: (session:VaultSession)=>void }) {
  const input = useRef<HTMLInputElement>(null);
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  async function exportBackup() {
    setError('');setMessage('');
    try {
      const filename='RECOMP_encrypted_backup_'+fileDate()+'.json';
      const file=new File([encryptedBackupJson() ],filename,{type:'application/json;charset=utf-8'});
      if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:filename});
      }else{
        const url=URL.createObjectURL(file);
        try{const a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.append(a);a.click();a.remove();}
        finally{setTimeout(()=>URL.revokeObjectURL(url),15000);}
      }
      setMessage('加密完整备份已生成，请妥善保存。');
    }catch(e){setError(e instanceof Error?e.message:'备份生成失败');}
  }
  async function importBackup() {
    setError('');setMessage('');
    const file=input.current?.files?.[0];
    if(!file){setError('请先选择加密备份文件');return;}
    if(file.size>8*1024*1024||file.size<100){setError('备份文件体积异常');return;}
    try{
      const session=await restoreEncryptedBackup(await file.text(),password,localStorage,
        ()=>window.confirm('将用该加密备份替换当前保险库记录。确认继续？'));
      if(!session){setMessage('已取消恢复，当前保险库未更改。');return;}
      onRestored(session);setPassword('');if(input.current)input.current.value='';
      setMessage('加密备份已验证并恢复。');
    }catch(e){setError(e instanceof Error?e.message:'备份恢复失败；当前记录保持不变。');}
  }
  return <section aria-label="加密完整备份与恢复" className="plan-manager">
    <h3>加密完整备份与恢复</h3>
    <p>备份文件保留原有 AES-256-GCM 加密格式和密码保护，可用于旧版 RECOMP 恢复。</p>
    <div className="export-actions"><button type="button" onClick={()=>void exportBackup()}>导出加密完整备份</button></div>
    <label>选择加密备份 JSON<input ref={input} type="file" accept=".json,application/json" /></label>
    <label>备份密码<input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} /></label>
    <button type="button" onClick={()=>void importBackup()}>验证并恢复备份</button>
    {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
