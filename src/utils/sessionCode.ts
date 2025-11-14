export const generateSessionCode = (): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return code;
};

export const formatSessionCode = (code: string): string => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};
