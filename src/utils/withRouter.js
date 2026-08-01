// src/utils/withRouter.js
import { useLocation, useNavigate, useParams } from 'react-router-dom'

export function withRouter(Component) {
	return function WrappedComponent(props) {
		const location = useLocation()
		const navigate = useNavigate()
		const params = useParams()

		return (
			<Component
				{...props}
				router={{ location, navigate, params }}
			/>
		)
	}
}