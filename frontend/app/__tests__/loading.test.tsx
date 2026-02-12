import { render, screen } from '@testing-library/react';
import TerminalLoading from '../terminal/loading';
import ProfileLoading from '../profile/loading';
import TradeLoading from '../trade/loading';
import WalletLoading from '../wallet/loading';

describe('Loading components', () => {
  it('TerminalLoading shows text', () => {
    render(<TerminalLoading />);
    expect(screen.getByText('Загрузка терминала...')).toBeInTheDocument();
  });

  it('ProfileLoading shows text', () => {
    render(<ProfileLoading />);
    expect(screen.getByText('Загрузка профиля...')).toBeInTheDocument();
  });

  it('TradeLoading shows text', () => {
    render(<TradeLoading />);
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('WalletLoading shows text', () => {
    render(<WalletLoading />);
    expect(screen.getByText('Загрузка кошелька...')).toBeInTheDocument();
  });
});
