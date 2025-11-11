import React, { useEffect } from 'react'
import { socket } from '../../sockets/socketManager'

const Home: React.FC = () => {

    useEffect(() => {
        socket.emit("newUser", "1234567890")
    }, [socket])
    
    return (
        <div>Home</div>
    )
}

export default Home