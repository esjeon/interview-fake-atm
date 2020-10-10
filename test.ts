import * as ATM from "./index";

const COOKIE = "hello, bank!"

const CARD = {
  cardNumber: "1234-5678-0000-0101",
  pin: "9999",
}

const ACCOUNTS = [
  {
    accountType: "Chequing",
    accountNo: "123456-01-987654",
    balance: 100,
  },
  {
    accountType: "Saving",
    accountNo: "123456-02-987654",
    balance: 3000,
  },
  {
    accountType: "Invest",
    accountNo: "123456-03-987654",
    balance: 4000,
  },
]

class FakeBank implements ATM.IBankService {
  constructor(
    public accounts: ATM.IAccount[]
  ) {
  }

  public verifyPIN(card: ATM.ICardData, pin: string): string | null {
    if (card.cardNumber === card.cardNumber && pin === (card as typeof CARD).pin)
      return COOKIE;
    return null;
  }

  public queryAccounts(cookie: any): ATM.IAccount[] {
    if (cookie !== COOKIE)
      throw new Error("invalid cookie");
    return this.accounts;
  }

  public queryBalance(cookie: any, account: ATM.IAccount): number {
    if (cookie !== COOKIE)
      throw new Error("invalid cookie");
    return (account as typeof ACCOUNTS[0]).balance;
  }

  public deposit(cookie: any, account: ATM.IAccount, amount: number): boolean {
    if (cookie !== COOKIE)
      throw new Error("invalid cookie");
    if (account.accountType === "Invest")
      return false;

    (account as typeof ACCOUNTS[0]).balance += amount;
    return true;
  }

  public withdraw(cookie: any, account: ATM.IAccount, amount: number): boolean {
    if (cookie !== COOKIE)
      throw new Error("invalid cookie");
    if ((account as typeof ACCOUNTS[0]).balance < amount)
      return false;

    (account as typeof ACCOUNTS[0]).balance -= amount;
    return true;
  }
}

class FakeMachine implements ATM.IMachine {
  public enteredPIN: string;

  public enteredAmount = 500;
  public selectedAccount = 0;
  public selectedAction = ATM.AccountAction.Deposit;
  public collectedAmount = 700;
  public storedAmount = 1000;

  public lastMessage: string | null = null;
  public lastError: string | null = null;
  public lastBalance: [ATM.IAccount, number] | null = null;

  constructor(
    public readonly card: ATM.ICardData
  ) {
    this.enteredPIN = (this.card as any).pin;
  }

  public showMessage(msg: string): void {
    this.lastMessage = msg;
    console.log(`* message: ${msg}`);
  }
  public showError(e: any): void {
    this.lastError = String(e);
    console.log(`# error: ${e}`);
  }
  public showBalance(account: ATM.IAccount, amount: number): void {
    this.lastBalance = [account, amount];
    console.log(`* balance: ${account.accountType} = ${amount}`)
  }

  public requestCard(): ATM.ICardData {
    return this.card;
  }

  public requestPIN(): string {
    return this.enteredPIN;
  }

  public requestAmount(): number {
    return this.enteredAmount;
  }

  public selectAccount(accounts: ATM.IAccount[]): ATM.IAccount {
    return accounts[this.selectedAccount];
  }

  public selectAccountAction(): ATM.AccountAction {
    return this.selectedAction;
  }

  public collectMoney(): number {
    this.storedAmount += this.collectedAmount;
    return this.collectedAmount;
  }

  public dispenseMoney(amount: number): void {
    this.storedAmount -= amount;
  }

  public hasMoney(amount: number): boolean {
    return (this.storedAmount >= amount);
  }
}

test('show the balance of saving account', () => {
  const balance = Math.floor(10000 * Math.random())
  const bank = new FakeBank(ACCOUNTS.map(acct => Object.assign({}, acct)));
  (bank.accounts[1] as typeof ACCOUNTS[0]).balance = balance;

  const machine = new FakeMachine(Object.assign({}, CARD));
  machine.selectedAccount = 1; // saving
  machine.selectedAction = ATM.AccountAction.ShowBalance;

  const ctrl = new ATM.ATMController(bank, machine);
  ctrl.runWizard();

  expect(machine.lastMessage).toBeNull();
  expect(machine.lastError).toBeNull();
  expect(machine.lastBalance).not.toBeNull();
  if (machine.lastBalance) {
    expect(machine.lastBalance[0].accountType).toBe("Saving")
    expect(machine.lastBalance[1]).toEqual(balance);
  }
})

test('deposit to saving account', () => {
  const bank = new FakeBank(ACCOUNTS.map(acct => Object.assign({}, acct)));
  (bank.accounts[1] as typeof ACCOUNTS[0]).balance = 1000;

  const machine = new FakeMachine(Object.assign({}, CARD));
  machine.selectedAccount = 1; // saving
  machine.selectedAction = ATM.AccountAction.Deposit;
  machine.collectedAmount = 500;

  const ctrl = new ATM.ATMController(bank, machine);
  ctrl.runWizard();

  expect((bank.accounts[1] as typeof ACCOUNTS[0]).balance).toBe(1500);
  expect(machine.lastMessage).toBeNull();
  expect(machine.lastError).toBeNull();
  expect(machine.lastBalance).toBeNull();
})

test('withdraw from chequing account', () => {
  const bank = new FakeBank(ACCOUNTS.map(acct => Object.assign({}, acct)));
  (bank.accounts[0] as typeof ACCOUNTS[0]).balance = 1000;

  const machine = new FakeMachine(Object.assign({}, CARD));
  machine.selectedAccount = 0; // cheque
  machine.selectedAction = ATM.AccountAction.Withdraw;
  machine.enteredAmount = 500;

  const ctrl = new ATM.ATMController(bank, machine);
  ctrl.runWizard();

  expect((bank.accounts[0] as typeof ACCOUNTS[0]).balance).toBe(500);
  expect(machine.lastMessage).toBeNull();
  expect(machine.lastError).toBeNull();
  expect(machine.lastBalance).toBeNull();
})

test('withdrawal fail due to low balance', () => {
  const bank = new FakeBank(ACCOUNTS.map(acct => Object.assign({}, acct)));
  (bank.accounts[0] as typeof ACCOUNTS[0]).balance = 100;

  const machine = new FakeMachine(Object.assign({}, CARD));
  machine.selectedAccount = 0; // cheque
  machine.selectedAction = ATM.AccountAction.Withdraw;
  machine.enteredAmount = 200;

  const ctrl = new ATM.ATMController(bank, machine);
  ctrl.runWizard();

  expect((bank.accounts[0] as typeof ACCOUNTS[0]).balance).toBe(100);
  expect(machine.lastMessage).not.toBeNull();
  expect(machine.lastError).toBeNull();
  expect(machine.lastBalance).toBeNull();
})

test('invalid PIN', () => {
  const bank = new FakeBank(ACCOUNTS.map(acct => Object.assign({}, acct)));
  const machine = new FakeMachine(Object.assign({}, CARD));
  machine.enteredPIN = "wrong-PIN";

  const ctrl = new ATM.ATMController(bank, machine);
  ctrl.runWizard();

  expect(machine.lastMessage).not.toBeNull();
  expect(machine.lastError).toBeNull();
  expect(machine.lastBalance).toBeNull();
})
