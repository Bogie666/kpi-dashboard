import React, { useState, useEffect } from 'react';
import { Upload, Camera, Trash2, Edit, Check, X, Loader, ImageIcon } from 'lucide-react';
import { put } from '@vercel/blob';

const TechnicianPhotoManager = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [newTechName, setNewTechName] = useState('');
  const [newTechDepartment, setNewTechDepartment] = useState('hvac_service');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const PHOTO_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/photo_api';
  
  const departments = [
    { value: 'hvac_service', label: 'HVAC Service' },
    { value: 'hvac_maintenance', label: 'HVAC Maintenance' },
    { value: 'hvac_replacement', label: 'HVAC Replacement' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'comfort_advisor', label: 'Comfort Advisor' },
    { value: 'call_center', label: 'Call Center' }
  ];

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${PHOTO_API}/technicians`);
      const data = await response.json();
      if (data.status === 'success') {
        setTechnicians(data.data);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
      alert('Error loading technicians');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToVercelBlob = async (file) => {
    try {
      const blob = await put(`technician-photos/${Date.now()}-${file.name}`, file, {
        access: 'public',
        token: 'vercel_blob_rw_rCVi7YK1DOpsCWkK_a8dDfPIZHlGcWvWfZ15JBAGqGSk5d2'
      });
      return blob.url;
    } catch (error) {
      console.error('Blob upload error:', error);
      throw new Error('Failed to upload to Vercel Blob');
    }
  };

  const handleSaveTechnician = async () => {
    if (!newTechName.trim()) {
      alert('Please enter technician name');
      return;
    }

    if (!selectedFile && !editingTech) {
      alert('Please select a photo');
      return;
    }

    setUploading(true);
    try {
      let photoUrl = editingTech?.photo_url;
      
      if (selectedFile) {
        photoUrl = await uploadToVercelBlob(selectedFile);
      }

      const response = await fetch(`${PHOTO_API}/technicians`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTechName,
          photo_url: photoUrl,
          department: newTechDepartment
        })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        alert(editingTech ? 'Technician updated successfully!' : 'Technician added successfully!');
        resetForm();
        loadTechnicians();
      } else {
        alert('Error saving technician: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving technician:', error);
      alert('Error saving technician: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (tech) => {
    setEditingTech(tech);
    setNewTechName(tech.name);
    setNewTechDepartment(tech.department || 'hvac_service');
    setPreviewUrl(tech.photo_url);
  };

  const handleDelete = async (techId) => {
    if (!confirm('Are you sure you want to delete this technician?')) return;

    try {
      const response = await fetch(`${PHOTO_API}/technicians/${techId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        alert('Technician deleted successfully');
        loadTechnicians();
      }
    } catch (error) {
      console.error('Error deleting technician:', error);
      alert('Error deleting technician');
    }
  };

  const resetForm = () => {
    setEditingTech(null);
    setNewTechName('');
    setNewTechDepartment('hvac_service');
    setSelectedFile(null);
    setPreviewUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Camera className="h-5 w-5 mr-2 text-blue-400" />
          {editingTech ? 'Edit Technician' : 'Add New Technician'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side - Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Technician Name *
              </label>
              <input
                type="text"
                value={newTechName}
                onChange={(e) => setNewTechName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department
              </label>
              <select
                value={newTechDepartment}
                onChange={(e) => setNewTechDepartment(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {departments.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Photo *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              <p className="text-xs text-gray-400 mt-1">Max 5MB • JPG, PNG, or WebP</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveTechnician}
                disabled={uploading || !newTechName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{editingTech ? 'Update' : 'Save'}</span>
                  </>
                )}
              </button>
              
              {editingTech && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Right side - Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preview
            </label>
            <div className="bg-gray-700 rounded-lg p-4 h-64 flex items-center justify-center border-2 border-dashed border-gray-600">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain rounded"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <ImageIcon className="h-16 w-16 mx-auto mb-2" />
                  <p>No photo selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Technician List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">
          Technician Photos ({technicians.length})
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-gray-400">Loading technicians...</p>
          </div>
        ) : technicians.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No technicians added yet</p>
            <p className="text-sm text-gray-500">Add your first technician using the form above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicians.map((tech) => (
              <div
                key={tech.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors border border-gray-600"
              >
                <div className="flex items-start space-x-4">
                  <img
                    src={tech.photo_url}
                    alt={tech.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-500"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{tech.name}</h4>
                    <p className="text-sm text-gray-400 capitalize">
                      {tech.department?.replace('_', ' ') || 'N/A'}
                    </p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => handleEdit(tech)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tech.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianPhotoManager;