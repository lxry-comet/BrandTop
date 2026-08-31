// src/components/Cart/CartWithNavigate.jsx
//
// Cart.jsx jest klasą i teraz korzysta z this.props.navigate (żeby przekierować
// do /checkout) — dokładnie ten sam wzorzec HOC co CheckoutWithNavigate.

import { useNavigate } from 'react-router-dom'
import Cart from './Cart.jsx'

export default function CartWithNavigate(props) {
	const navigate = useNavigate()
	return <Cart {...props} navigate={navigate} />
}
