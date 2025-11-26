import Chat from "./chat/Chat";
import Interaction from "./interaction/Interaction";

const Home: React.FC = () => {
  return (
    <>
      <Chat />
      <Interaction/>
    </>
  );
};

export default Home;