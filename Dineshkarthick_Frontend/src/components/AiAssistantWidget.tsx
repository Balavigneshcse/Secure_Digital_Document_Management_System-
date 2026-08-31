import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { sendAssistantMessage } from '../services/assistantService';
import type { ChatMessage } from '../types';
import { palette } from '../theme';

export default function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi, I'm the SentinelDMS assistant. Ask me about a case, a document, or where something stands.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendAssistantMessage(text);
      setMessages((m) => [...m, reply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <Fab
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}
        >
          <ChatBubbleOutlineIcon sx={{ color: '#fff' }} />
        </Fab>
      )}

      {open && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: { xs: 0, sm: 24 },
            right: { xs: 0, sm: 24 },
            left: { xs: 0, sm: 'auto' },
            width: { xs: '100%', sm: 360 },
            height: { xs: '85vh', sm: 480 },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: { xs: '16px 16px 0 0', sm: 3 },
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          <Box sx={{ bgcolor: palette.ink, color: '#fff', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>SentinelDMS Assistant</Typography>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2, bgcolor: '#F6F5EE' }}>
            {messages.map((m) => (
              <Box key={m.id} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <Box
                  sx={{
                    bgcolor: m.role === 'user' ? palette.registry : '#fff',
                    color: m.role === 'user' ? '#fff' : '#1A2333',
                    border: m.role === 'user' ? 'none' : '1px solid #E2DFD1',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Typography variant="body2">{m.text}</Typography>
                </Box>
                {m.sources && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.7 }}>
                    {m.sources.map((s) => (
                      <Chip key={s.docId} label={s.label} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            {loading && <CircularProgress size={18} sx={{ alignSelf: 'flex-start', ml: 1 }} />}
            <div ref={endRef} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #E2DFD1', px: 1, py: 0.7 }}>
            <InputBase
              placeholder="Ask about a case or document…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              sx={{ flex: 1, fontSize: '0.85rem', px: 1 }}
            />
            <IconButton size="small" onClick={handleSend} sx={{ color: palette.registry }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
}
