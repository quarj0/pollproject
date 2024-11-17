import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';

const Logout = ({ logout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    logout(); 
    navigate("/login"); 
  }, [logout, navigate]);

  return <div>Logging out...</div>;
};
Logout.propTypes = {
  logout: PropTypes.func.isRequired,
};

export default Logout;
