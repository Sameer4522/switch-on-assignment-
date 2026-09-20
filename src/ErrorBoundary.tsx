import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { failed: false };

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	render() {
		if (!this.state.failed) return this.props.children;

		return (
			<div className="empty">
				<p>Something went wrong here.</p>
				<p className="muted">
					The rest of MediaVault is still working. You can load this part again.
				</p>
				<button onClick={() => this.setState({ failed: false })}>
					Try again
				</button>
			</div>
		);
	}
}
