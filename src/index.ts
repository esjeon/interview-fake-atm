
export interface ICardData {
  readonly cardNumber: string;
  // readonly name: string;
  // readonly expirationData: string;
  // readonly serviceCode: string;
  // ... etc ...
}

export interface IAccount {
  readonly accountNo: string;
  // readonly accountType: string;
  // readonly balance: number;
  // ... etc ...
}

export interface IBankService {
  verifyPIN(card: ICardData, pin: string): any;

  queryAccounts(cookie: any): IAccount[];
  queryBalance(cookie: any, account: IAccount): number;

  deposit(cookie: any, account: IAccount, amount: number): boolean;
  withdraw(cookie: any, account: IAccount, amount: number): boolean;
}

export enum AccountAction {
  ShowBalance,
  Deposit,
  Withdraw
}

export interface IMachine {
  showMessage(msg: string): void;
  showError(e: any): void;
  showBalance(account: IAccount, amount: number): void;

  requestCard(): ICardData;
  requestPIN(): string;
  requestAmount(): number;

  selectAccount(accounts: IAccount[]): IAccount;
  selectAccountAction(): AccountAction;

  collectMoney(): number;
  dispenseMoney(amount: number): void;
  hasMoney(amount: number): boolean;
}

export class ATMController {
  constructor(
    public readonly bank: IBankService,
    public readonly machine: IMachine,
  ) {
  }
  
  public run() {
    for(;;) {
      try {
        this.runWizard();
      } catch(e) {
        this.machine.showError(e);
      }
    }
  }

  private runWizard() {
    const card = this.machine.requestCard();

    const cookie = this.verifyPIN(card);
    if (cookie === null) {
      this.machine.showMessage("PIN verification failed.")
      return;
    }

    const accounts = this.bank.queryAccounts(cookie);
    const account = this.machine.selectAccount(accounts);

    const action = this.machine.selectAccountAction();

    let amount;
    let result;
    switch(action) {
      case AccountAction.ShowBalance:
        amount = this.bank.queryBalance(cookie, account);
        this.machine.showBalance(account, amount);
        break;

      case AccountAction.Deposit:
        amount = this.machine.collectMoney();
        result = this.bank.deposit(cookie, account, amount);
        if (!result) {
          this.machine.showMessage("Deposit failed");
          this.machine.dispenseMoney(amount);
        }
        break;

      case AccountAction.Withdraw:
        amount = this.machine.requestAmount();

        if (amount > this.bank.queryBalance(cookie, account)) {
          this.machine.showMessage("Not enough balance");
          break;
        }

        if (!this.machine.hasMoney(amount)) {
          this.machine.showMessage("Not enough cash in the ATM");
          break;
        }

        if (this.bank.withdraw(cookie, account, amount)) {
          this.machine.dispenseMoney(amount);
        }
        break;
    }
  }

  private verifyPIN(card: ICardData): string | null {
    for (let i = 0; i < 3; i++) {
      const pin = this.machine.requestPIN();

      const cookie = this.bank.verifyPIN(card, pin);
      if (cookie)
        return cookie;

      this.machine.showMessage("Wrong PIN");
    }

    return null;
  }
}

