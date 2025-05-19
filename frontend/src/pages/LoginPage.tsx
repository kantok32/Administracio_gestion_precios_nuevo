import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, TextField, Button, Typography, Box, Avatar } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTheme } from '@mui/material/styles';
import ecoAllianceLogo from '../assets/Logotipo_EAX-EA.png'; // Ajustar ruta si es necesario

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault(); // Prevenir recarga de página en submit de formulario
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/dashboard');
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      backgroundColor: theme.palette.background.default 
    }}>
      <Paper elevation={6} sx={{ 
        padding: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        width: '100%', // Para que el Paper ocupe el maxWidth del Container
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius // Usar el borderRadius del tema
      }}>
        <img src={ecoAllianceLogo} alt="Logo" style={{ height: '60px', marginBottom: '20px' }} />
        <Avatar sx={{ m: 1, bgcolor: theme.palette.primary.main }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" color="text.primary">
          Iniciar Sesión
        </Typography>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Usuario"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={!!error} // Mostrar error en el campo si existe
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Contraseña"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error} // Mostrar error en el campo si existe
            helperText={error} // Mostrar mensaje de error debajo del campo
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary" // Usar color primario del tema
            sx={{ mt: 3, mb: 2, borderRadius: theme.shape.borderRadius }}
          >
            Entrar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage; 