import ConceptModal from "./components/ConceptModal";
import { MatrixProvider } from "./context/MatrixContext";

function App() {
  return <MatrixProvider>

<ConceptModal />

</MatrixProvider>;
}

export default App;