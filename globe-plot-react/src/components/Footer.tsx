import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center bg-primary rounded-full w-6 h-6 overflow-hidden">
                <div className="text-primary-foreground text-sm" style={{ marginTop: '-2px' }}>🌍</div>
              </div>
              <span className="text-sm font-bold">Globeplot</span>
            </Link>
            <span className="text-xs text-muted-foreground ml-4">© {new Date().getFullYear()}</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            {/* <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="mailto:contact@globeplot.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a> */}
          </div>
        </div>
      </div>
    </footer>
  );
} 