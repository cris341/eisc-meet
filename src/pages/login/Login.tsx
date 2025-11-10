import type React from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const navigate = useNavigate();

    const handleLoginGoogle = (e: React.FormEvent) => {
        e.preventDefault();
        navigate("/profile")
    }

    return (
        <div className="container-page">
            <div >
                <h1>Iniciar Sesión</h1>
                <div>
                    <button onClick={handleLoginGoogle} >
                        <img src="icons/google-icon.svg" alt="Iniciar sesión con Google" width={24} height={24} />
                        <span>Google</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login